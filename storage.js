require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt } = require('./in-crypt');
const { isPositiveInt, parsePoPError } = require('./utils');
const { StorageServerError } = require('./errors');

/**
 * @typedef Record
 * @property {string} key
 */

/**
 * @typedef StorageOptions
 * @property {string} apiKey
 * @property {string} environmentId
 * @property {string} endpoint
 * @property {boolean} encrypt
 */

class Storage {
  static get MAX_LIMIT() {
    return 100;
  }

  /**
   * @param {StorageOptions} options
   * @param {import('./secret-key-accessor')} secretKeyAccessor
   * @param {import('./logger')} logger
   */
  constructor(options, secretKeyAccessor, logger, countriesCache) {
    if (logger) {
      this.setLogger(logger);
    } else {
      this._logger = defaultLogger.withBaseLogLevel('info');
    }

    this._apiKey = options.apiKey || process.env.INC_API_KEY;
    if (!this._apiKey) {
      throw new Error('Please pass apiKey in options or set INC_API_KEY env var');
    }

    this._envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!this._envId) {
      throw new Error('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
    }

    this._endpoint = options.endpoint;

    if (options.encrypt !== false) {
      this._encryptionEnabled = true;
      this._crypto = new InCrypt(secretKeyAccessor);
    } else {
      this._encryptionEnabled = false;
      this._crypto = new InCrypt();
    }

    this._countriesCache = countriesCache || new CountriesCache();
  }

  createKeyHash(s) {
    const stringToHash = `${s}:${this._envId}`;
    return crypto
      .createHash('sha256')
      .update(stringToHash, 'utf8')
      .digest('hex');
  }

  setLogger(logger) {
    if (!logger) {
      throw new Error('Please specify a logger');
    }
    if (!logger.write || typeof logger.write !== 'function') {
      throw new Error('Logger must implement write function');
    }
    if (logger.write.length < 2) {
      throw new Error('Logger.write must have at least 2 parameters');
    }
    this._logger = logger;
  }

  setSecretKeyAccessor(secretKeyAccessor) {
    if (!(secretKeyAccessor instanceof SecretKeyAccessor)) {
      throw new Error('You must pass an instance of SecretKeyAccessor');
    }
    this._crypto = new InCrypt(secretKeyAccessor);
  }

  setCountriesCache(countriesCache) {
    if (!(countriesCache instanceof CountriesCache)) {
      throw new Error('You must pass an instance of CountriesCache');
    }
    this._countriesCache = countriesCache;
  }

  _logAndThrowError(errorMessage, meta) {
    this._logger.write('error', errorMessage, meta);
    throw new Error(errorMessage);
  }


  _validateRecord(record) {
    if (!record.country) throw new Error('Missing country');
    if (!record.key) throw new Error('Missing key');
  }

  async writeAsync(record, requestOptions = {}) {
    let endpoint;
    let data;
    try {
      this._validateRecord(record);

      const countrycode = record.country.toLowerCase();

      data = {
        country: countrycode,
        key: record.key,
      };

      if (record.body) data.body = record.body;
      if (record.profile_key) data.profile_key = record.profile_key;
      if (record.range_key) data.range_key = record.range_key;
      if (record.key2) data.key2 = record.key2;
      if (record.key3) data.key3 = record.key3;

      endpoint = await this._getEndpointAsync(countrycode, `v2/storage/records/${countrycode}`);

      data = await this._encryptPayload(data);

      this._logger.write('info', `Sending POST ${endpoint}`, {
        endpoint,
        country: countrycode,
        op_result: 'in_progress',
        key: data.key,
        operation: 'Write',
      });

      const response = await this._apiClient(countrycode, `v2/storage/records/${countrycode}`, {
        method: 'post',
        data,
        endpoint,
      }, requestOptions);

      this._logger.write('info', `Finished POST ${endpoint}`, {
        endpoint,
        country: countrycode,
        op_result: 'success',
        responseHeaders: response.headers,
        requestHeaders: response.config.headers,
        key: data.key,
        operation: 'Write',
      });

      return response;
    } catch (err) {
      const popError = parsePoPError(err);
      this._logger.write('error', err, {
        endpoint,
        country: record.country,
        op_result: 'error',
        key: record.key,
        requestHeaders: popError.requestHeaders,
        responseHeaders: popError.responseHeaders,
        operation: 'Write',
        message: popError.errorMessage || err.message,
      });
      throw (err);
    }
  }

  /**
   * Find records matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ meta: { total: number, count: number }, records: Array<Record> }>} Matching records.
   */
  async find(country, filter, options = {}, requestOptions = {}) {
    let endpoint;
    try {
      if (typeof country !== 'string') {
        throw new Error('Missing country');
      }

      if (options.limit) {
        if (!isPositiveInt(options.limit)) {
          throw new Error('Limit should be a positive integer');
        }

        if (options.limit > Storage.MAX_LIMIT) {
          throw new Error(`Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`);
        }
      }

      const countryCode = country.toLowerCase();

      const data = {
        filter: this._hashKeys(filter),
        options,
      };

      endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/find`);

      this._logger.write('info', `Sending POST ${endpoint}`, {
        endpoint,
        country: countryCode,
        op_result: 'in_progress',
        operation: 'Find',
        requestHeaders: requestOptions.headers,
      });

      const response = await this._apiClient(
        countryCode,
        `v2/storage/records/${countryCode}/find`,
        {
          method: 'post',
          data,
        },
        requestOptions,
      );

      this._logger.write('info', `Finished POST ${endpoint}`, {
        endpoint,
        country: countryCode,
        op_result: 'success',
        responseHeaders: response.headers,
        requestHeaders: response.config.headers,
        operation: 'Find',
      });

      const result = {
        data: [],
        meta: {},
      };

      if (response.data) {
        const decrypted = await Promise.all(
          response.data.data.map((item) => this._decryptPayload(item).catch((e) => ({
            error: e.message,
            rawData: item,
          }))),
        );

        const errors = [];
        decrypted.forEach((item) => {
          if (item.error) {
            errors.push(item);
          } else {
            result.data.push(item);
          }
        });

        if (errors.length) {
          result.errors = errors;
        }

        result.meta = response.data.meta;
      }

      return result;
    } catch (err) {
      const popError = parsePoPError(err);
      this._logger.write('error', err, {
        endpoint,
        country,
        op_result: 'error',
        requestHeaders: popError.requestHeaders,
        responseHeaders: popError.responseHeaders,
        operation: 'Find',
        message: popError.errorMessage || err.message,
      });
      throw err;
    }
  }

  /**
   * Find first record matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async findOne(country, filter, options = {}, requestOptions = {}) {
    const result = await this.find(country, filter, options, requestOptions);
    if (result && result.data && result.data.length) {
      return result.data[0];
    }
    return null;
  }

  async readAsync(record, requestOptions = {}) {
    let endpoint;
    let key;
    try {
      this._validateRecord(record);

      const countryCode = record.country.toLowerCase();
      key = await this.createKeyHash(record.key);

      endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`);

      this._logger.write('info', `Sending GET ${endpoint}`, {
        endpoint,
        country: countryCode,
        op_result: 'in_progress',
        key,
        operation: 'Read',
        requestHeaders: requestOptions.headers,
      });

      const response = await this._apiClient(
        countryCode,
        `v2/storage/records/${countryCode}/${key}`,
        {
          method: 'get',
        },
        requestOptions,
      );

      this._logger.write('info', `Finished GET ${endpoint}`, {
        endpoint,
        country: countryCode,
        key,
        op_result: 'success',
        responseHeaders: response.headers,
        requestHeaders: response.config.headers,
        operation: 'Read',
      });

      response.data = await this._decryptPayload(response.data);

      return response;
    } catch (err) {
      if (/Request failed with status code 404/i.test(err.message)) {
        this._logger.write('warn', 'Resource not found, return key in response data with status of 404');
        this._logger.write('error', err, {
          endpoint,
          country: record.country,
          key,
          op_result: 'error',
          requestHeaders: err.requestHeaders,
          responseHeaders: err.responseHeaders,
          operation: 'Read',
          message: 'Resource not found, return key in response data with status of 404',
        });
        return {
          data: {
            body: undefined,
            key: record.key,
            key2: undefined,
            key3: undefined,
            profile_key: undefined,
            range_key: undefined,
            version: undefined,
            env_id: undefined,
          },
          error: `Could not find a record for key: ${record.key}`,
          status: 404,
        };
      }
      const popError = parsePoPError(err);
      this._logger.write('error', err, {
        endpoint,
        country: record.country,
        key,
        op_result: 'error',
        requestHeaders: popError.requestHeaders,
        responseHeaders: popError.responseHeaders,
        operation: 'Read',
        message: popError.errorMessage || err.message,
      });
      throw err;
    }
  }

  async _encryptPayload(originalRecord) {
    this._logger.write('debug', 'Encrypting...');
    this._logger.write('debug', JSON.stringify(originalRecord, null, 2));

    const record = { ...originalRecord };
    const body = {
      meta: {},
    };
    ['profile_key', 'key', 'key2', 'key3'].forEach((field) => {
      if (record[field] != null) {
        body.meta[field] = record[field];
        record[field] = this.createKeyHash(record[field]);
      }
    });
    if (record.body !== undefined) {
      body.payload = record.body;
    }

    record.body = await this._crypto.encryptAsync(
      JSON.stringify(body),
    );
    this._logger.write('debug', 'Finished encryption');
    this._logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }

  _hashKeys(originalRecord) {
    const record = { ...originalRecord };
    ['profile_key', 'key', 'key2', 'key3'].forEach((field) => {
      if (record[field] != null) {
        if (Array.isArray(record[field])) {
          record[field] = record[field].map((v) => this.createKeyHash(v));
        } else {
          record[field] = this.createKeyHash(record[field]);
        }
      }
    });
    return record;
  }

  async _decryptPayload(originalRecord) {
    this._logger.write('debug', 'Start decrypting...');
    this._logger.write('debug', JSON.stringify(originalRecord, null, 2));
    const record = { ...originalRecord };
    const decrypted = await this._crypto.decryptAsync(record.body);
    let body;
    try {
      body = JSON.parse(decrypted);
    } catch (e) {
      return {
        ...record,
        body: decrypted,
      };
    }
    if (body.meta) {
      Object.keys(body.meta).forEach((key) => {
        record[key] = body.meta[key];
      });
    }
    if (body.payload !== undefined) {
      record.body = body.payload;
    } else {
      delete record.body;
    }
    this._logger.write('debug', 'Finished decryption');
    this._logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }

  /**
   * Update a record matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {object} doc - New values to be set in matching records.
   * @param {object} options - Options object.
   * @return {Promise<{ record: Record }>} Operation result.
   */
  async updateOne(country, filter, doc, options = { override: false }, requestOptions = {}) {
    if (typeof country !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (options.override && doc.key) {
      return this.writeAsync({ country, ...doc }, requestOptions);
    }

    const result = await this.find(country, filter, { limit: 1 }, requestOptions);
    if (result.meta.total >= 2) {
      this._logAndThrowError('Multiple records found');
    }
    if (result.meta.total === 1) {
      const newData = {
        ...result.data[0],
        ...doc,
      };
      return this.writeAsync({
        country,
        ...newData,
      }, requestOptions);
    }

    throw new Error('Record not found');
  }

  async deleteAsync(record, requestOptions = {}) {
    let endpoint;
    let key;
    try {
      this._validateRecord(record);
      key = await this.createKeyHash(record.key);

      endpoint = await this._getEndpointAsync(record.country, `v2/storage/records/${record.country}/${key}`);

      this._logger.write('info', `Sending DELETE ${endpoint}`, {
        endpoint,
        country: record.country,
        op_result: 'in_progress',
        key,
        operation: 'Delete',
        method: 'DELETE',
        requestHeaders: requestOptions.headers,
      });

      const response = await this._apiClient(
        record.country,
        `v2/storage/records/${record.country}/${key}`,
        {
          method: 'delete',
        },
        requestOptions,
      );

      this._logger.write('info', `Finished DELETE ${endpoint}`, {
        endpoint,
        country: record.country,
        op_result: 'success',
        responseHeaders: response.headers,
        requestHeaders: response.config.headers,
        operation: 'Delete',
        method: 'DELETE',
      });

      return response;
    } catch (err) {
      this._logger.write('error', err);
      throw err;
    }
  }

  async _getEndpointAsync(countryCode, path) {
    if (this._endpoint) {
      return `${this._endpoint}/${path}`;
    }

    const countryRegex = new RegExp(countryCode, 'i');
    let countryHasApi;
    try {
      countryHasApi = (
        await this._countriesCache.getCountriesAsync()
      ).find((country) => countryRegex.test(country.id));
    } catch (err) {
      this._logger.write('error', err);
    }

    return countryHasApi
      ? `https://${countryCode}.api.incountry.io/${path}`
      : `https://us.api.incountry.io/${path}`;
  }

  headers() {
    return {
      Authorization: `Bearer ${this._apiKey}`,
      'x-env-id': this._envId,
      'Content-Type': 'application/json',
    };
  }

  /**
   * @param {string} country
   * @param {string} path
   * @param {{method: string, data: *}} params - axios params
   */
  async _apiClient(country, path, params = {}, requestOptions = {}) {
    const url = params.endpoint || await this._getEndpointAsync(country.toLowerCase(), path);
    let headers = this.headers();
    if (requestOptions.headers) {
      headers = {
        ...headers,
        ...requestOptions.headers,
      };
    }
    return axios({
      url,
      headers,
      ...params,
    }).catch((err) => {
      throw new StorageServerError(err);
    });
  }
}

module.exports = Storage;
