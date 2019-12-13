require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt } = require('./in-crypt');
const { PositiveInt } = require('./utils');
const {
  StorageClientError,
  StorageServerError,
} = require('./errors');

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
      this._logger = defaultLogger.withBaseLogLevel('debug');
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

  _logAndThrowError(errorMessage) {
    this._logger.write('error', errorMessage);
    throw new Error(errorMessage);
  }

  _validateRecord(record) {
    if (!record.country) throw new StorageClientError('Missing country');
    if (!record.key) throw new StorageClientError('Missing key');
  }

  async writeAsync(record) {
    this._validateRecord(record);

    const countrycode = record.country.toLowerCase();

    let data = {
      country: countrycode,
      key: record.key,
    };

    if (record.body !== undefined) data.body = record.body;
    if (record.profile_key) data.profile_key = record.profile_key;
    if (record.range_key) data.range_key = record.range_key;
    if (record.key2) data.key2 = record.key2;
    if (record.key3) data.key3 = record.key3;

    data = await this._encryptPayload(data);

    this._logger.write('debug', `Raw data: ${JSON.stringify(data)}`);

    await this._apiClient(
      countrycode,
      `v2/storage/records/${countrycode}`,
      {
        method: 'post',
        data,
      },
    );

    return { record };
  }

  /**
   * Write many records at once
   * @param {string} countryCode
   * @param {Array<Record>} records
   */
  async batchWrite(countryCode, records) {
    try {
      if (!records.length) {
        throw new Error('You must pass non-empty array');
      }

      const data = await Promise.all(
        records.map((r) => {
          this._validateRecord(r);
          return this._encryptPayload(r);
        }),
      );

      await this._apiClient(
        countryCode,
        `v2/storage/records/${countryCode}/batchWrite`,
        {
          method: 'post',
          data,
        },
      );

      return { records };
    } catch (err) {
      this._logger.write('error', err);
      throw err;
    }
  }

  /**
   * @param {string} country - Country code.
   * @param {number} limit - Find limit
   * @returns {Promise<{ meta: { migrated: number, totalLeft: number } }>}
   */
  async migrate(country, limit) {
    if (!this._encryptionEnabled) {
      throw new Error('Migration not supported when encryption is off');
    }

    const currentSecretVersion = await this._crypto.getCurrentSecretVersion();
    const findFilter = { version: { $not: currentSecretVersion } };
    const findOptions = { limit };
    const { records, meta } = await this.find(country, findFilter, findOptions);
    await this.batchWrite(country, records);

    return {
      meta: {
        migrated: meta.count,
        totalLeft: meta.total - meta.count,
      },
    };
  }

  /**
   * Find records matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ meta: { total: number, count: number }, records: Array<Record> }>} Matching records.
   */
  async find(country, filter, options = {}) {
    if (typeof country !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (options.limit) {
      if (!PositiveInt.is(options.limit)) {
        this._logAndThrowError('Limit should be a positive integer');
      }

      if (options.limit > Storage.MAX_LIMIT) {
        this._logAndThrowError(
          `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`,
        );
      }
    }

    const countryCode = country.toLowerCase();

    const data = {
      filter: this._hashKeys(filter),
      options,
    };

    const response = await this._apiClient(
      countryCode,
      `v2/storage/records/${countryCode}/find`,
      {
        method: 'post',
        data,
      },
    );

    const result = {
      records: [],
      meta: {},
    };

    if (response.data) {
      result.meta = response.data.meta;
      result.records = await Promise.all(
        response.data.data.map((item) => this._decryptPayload(item)),
      );
    }

    return result;
  }

  /**
   * Find first record matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async findOne(country, filter, options = {}) {
    const result = await this.find(country, filter, options);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  async readAsync(record) {
    this._validateRecord(record);

    const countryCode = record.country.toLowerCase();
    const key = await this.createKeyHash(record.key);

    const response = await this._apiClient(
      countryCode,
      `v2/storage/records/${countryCode}/${key}`,
      {
        method: 'get',
      },
    );


    this._logger.write('debug', `Raw data: ${JSON.stringify(response.data)}`);
    this._logger.write('debug', 'Decrypting...');
    const recordData = await this._decryptPayload(response.data);
    this._logger.write('debug', `Decrypted data: ${JSON.stringify(recordData)}`);

    return { record: recordData };
  }

  async _encryptPayload(originalRecord) {
    this._logger.write('debug', 'Encrypting...');

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

    const { message, secretVersion } = await this._crypto.encryptAsync(
      JSON.stringify(body),
    );
    record.body = message;
    record.version = secretVersion;
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
    const record = { ...originalRecord };
    const decrypted = await this._crypto.decryptAsync(
      record.body,
      record.version,
    );
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
  async updateOne(country, filter, doc, options = { override: false }) {
    if (typeof country !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (options.override && doc.key) {
      return this.writeAsync({ country, ...doc });
    }

    const result = await this.find(country, filter, { limit: 1 });
    if (result.meta.total >= 2) {
      this._logAndThrowError('Multiple records found');
    }
    if (result.meta.total === 1) {
      const newData = {
        ...result.records[0],
        ...doc,
      };
      return this.writeAsync({
        country,
        ...newData,
      });
    }
    this._logAndThrowError('Record not found');
  }

  async deleteAsync(record) {
    try {
      this._validateRecord(record);
      const key = await this.createKeyHash(record.key);

      await this._apiClient(
        record.country,
        `v2/storage/records/${record.country}/${key}`,
        {
          method: 'delete',
        },
      );

      return { success: true };
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
   * @param {{ method: string, url: string, headers: object }} params - axious params
   */
  async _apiClient(country, path, params = {}) {
    const url = await this._getEndpointAsync(country.toLowerCase(), path);
    const method = typeof params.method === 'string' ? params.method.toUpperCase() : '';
    this._logger.write('debug', `${method} ${url}`);
    return axios({
      url,
      headers: this.headers(),
      ...params,
    }).catch((err) => {
      const storageServerError = new StorageServerError(err.code, err.response ? err.response.data : {}, `${method} ${url} ${err.message}`);
      this._logger.write('error', storageServerError);
      throw storageServerError;
    });
  }
}

module.exports = Storage;
