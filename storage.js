require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const pjson = require('./package.json');

const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt } = require('./in-crypt');
const { PositiveInt, tryValidate } = require('./utils');
const {
  StorageServerError,
} = require('./errors');

const RecordIO = require('./dto/record');

const SDK_VERSION = pjson.version;

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

/**
* @typedef Logger
* @property {(logLevel: string, message: string, id?: string, timestamp?: string) => boolean} write
*/

class Storage {
  static get MAX_LIMIT() {
    return 100;
  }

  /**
   * @param {StorageOptions} options
   * @param {import('./secret-key-accessor')} secretKeyAccessor
   * @param {Logger} logger
   * @param {import('./countries-cache')} countriesCache
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
      this.setSecretKeyAccessor(secretKeyAccessor);
    } else {
      this._encryptionEnabled = false;
      this.setSecretKeyAccessor();
    }

    this.setCountriesCache(countriesCache || new CountriesCache());
  }

  createKeyHash(s) {
    const stringToHash = `${s}:${this._envId}`;
    return crypto
      .createHash('sha256')
      .update(stringToHash, 'utf8')
      .digest('hex');
  }

  /**
   * @param {Logger | unknown} logger
   */
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

  /**
   * @param {import('./secret-key-accessor') | unknown} secretKeyAccessor
   */
  setSecretKeyAccessor(secretKeyAccessor) {
    if (secretKeyAccessor !== undefined && !(secretKeyAccessor instanceof SecretKeyAccessor)) {
      throw new Error('secretKeyAccessor must be an instance of SecretKeyAccessor');
    }
    this._crypto = new InCrypt(secretKeyAccessor);
  }

  /**
   * @param {import('./countries-cache') | unknown} countriesCache
   */
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

  /**
 * @param {string} countryCode - Country code.
 * @param {Record} record
 * @return {Promise<{ record: Record }>} Matching record.
 */
  async writeAsync(countryCode, record) {
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    tryValidate(RecordIO.decode(record));

    const data = await this._encryptPayload(record);

    this._logger.write('debug', `Raw data: ${JSON.stringify(data)}`);

    await this._apiClient(
      countryCode,
      `v2/storage/records/${countryCode}`,
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
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    try {
      if (!records.length) {
        throw new Error('You must pass non-empty array');
      }

      const encryptedRecords = await Promise.all(
        records.map((r) => {
          tryValidate(RecordIO.decode(r));
          return this._encryptPayload(r);
        }),
      );

      await this._apiClient(
        countryCode,
        `v2/storage/records/${countryCode}/batchWrite`,
        {
          method: 'post',
          data: {
            records: encryptedRecords,
          },
        },
      );

      return { records };
    } catch (err) {
      this._logger.write('error', err);
      throw err;
    }
  }

  _validateLimit(limit) {
    if (!PositiveInt.is(limit)) {
      this._logAndThrowError('Limit should be a positive integer');
    }

    if (limit > Storage.MAX_LIMIT) {
      this._logAndThrowError(
        `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`,
      );
    }
  }

  /**
   * @param {string} countryCode - Country code.
   * @param {number} limit - Find limit
   * @returns {Promise<{ meta: { migrated: number, totalLeft: number } }>}
   */
  async migrate(countryCode, limit) {
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    this._validateLimit(limit);

    if (!this._encryptionEnabled) {
      throw new Error('Migration not supported when encryption is off');
    }

    const currentSecretVersion = await this._crypto.getCurrentSecretVersion();
    const findFilter = { version: { $not: currentSecretVersion } };
    const findOptions = { limit };
    const { records, meta } = await this.find(countryCode, findFilter, findOptions);
    await this.batchWrite(countryCode, records);

    return {
      meta: {
        migrated: meta.count,
        totalLeft: meta.total - meta.count,
      },
    };
  }

  /**
   * Find records matching filter.
   * @param {string} countryCode - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ meta: { total: number, count: number }, records: Array<Record> }>} Matching records.
   */
  async find(countryCode, filter, options = {}) {
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (options.limit) {
      this._validateLimit(options.limit);
    }

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
   * @param {string} countryCode - Country code.
   * @param {object} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async findOne(countryCode, filter, options = {}) {
    const result = await this.find(countryCode, filter, options);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  /**
   * @param {string} countryCode - Country code.
   * @param {string} recordKey
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async readAsync(countryCode, recordKey) {
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (typeof recordKey !== 'string') {
      this._logAndThrowError('Missing key');
    }

    const key = await this.createKeyHash(recordKey);

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
   * @param {string} countryCode - Country code.
   * @param {object} filter - The filter to apply.
   * @param {object} doc - New values to be set in matching records.
   * @param {object} options - Options object.
   * @return {Promise<{ record: Record }>} Operation result.
   */
  async updateOne(countryCode, filter, doc, options = { override: false }) {
    if (typeof countryCode !== 'string') {
      this._logAndThrowError('Missing country');
    }

    if (options.override && doc.key) {
      return this.writeAsync(countryCode, { ...doc });
    }

    const result = await this.find(countryCode, filter, { limit: 1 });
    if (result.meta.total > 1) {
      this._logAndThrowError('Multiple records found');
    } else if (result.meta.total === 0) {
      this._logAndThrowError('Record not found');
    }

    const newData = {
      ...result.records[0],
      ...doc,
    };

    return this.writeAsync(countryCode, { ...newData });
  }

  async deleteAsync(countryCode, recordKey) {
    try {
      if (typeof countryCode !== 'string') {
        this._logAndThrowError('Missing country');
      }

      if (typeof recordKey !== 'string') {
        this._logAndThrowError('Missing key');
      }

      const key = await this.createKeyHash(recordKey);

      await this._apiClient(
        countryCode,
        `v2/storage/records/${countryCode}/${key}`,
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
      'User-Agent': `SDK-Node.js/${SDK_VERSION}`,
    };
  }

  /**
   * @param {string} countryCode
   * @param {string} path
   * @param {{ method: string, url: string, headers: object }} params - axious params
   */
  async _apiClient(countryCode, path, params = {}) {
    const url = await this._getEndpointAsync(countryCode.toLowerCase(), path);
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
