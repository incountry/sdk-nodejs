require('dotenv').config();
const crypto = require('crypto');

const { ApiClient } = require('./api-client');
const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt, SUPPORTED_VERSIONS } = require('./in-crypt');
const { isError } = require('./errors');

const { validateRecord } = require('./validation/record');
const { validateRecordsNEA } = require('./validation/records');
const { validateCountryCode } = require('./validation/country-code');
const { validateFindOptions } = require('./validation/find-options');
const { validateLimit } = require('./validation/limit');
const { validateRecordKey } = require('./validation/record-key');

/**
 * @typedef {import('./secret-key-accessor')} SecretKeyAccessor
 */

/**
 * @typedef {import('./countries-cache')} CountriesCache
 */

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
 * @typedef {Object} CustomEncryption
 * @property {function} encrypt
 * @property {function} decrypt
 * @property {string} version
 * @property {boolean} [isCurrent]
 */

/**
* @typedef Logger
* @property {(logLevel: string, message: string, id?: string, timestamp?: string) => boolean} write
*/

class Storage {
  /**
   * @param {StorageOptions} options
   * @param {SecretKeyAccessor} secretKeyAccessor
   * @param {Logger} logger
   * @param {CountriesCache} countriesCache
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

    this.apiClient = new ApiClient(this._apiKey, this._envId, this._endpoint, (...args) => this._logger.write(...args), (...args) => this._countriesCache.getCountriesAsync(...args));
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
   * @param {SecretKeyAccessor | unknown} secretKeyAccessor
   */
  setSecretKeyAccessor(secretKeyAccessor) {
    if (secretKeyAccessor !== undefined && !(secretKeyAccessor instanceof SecretKeyAccessor)) {
      throw new Error('secretKeyAccessor must be an instance of SecretKeyAccessor');
    }
    this._crypto = new InCrypt(secretKeyAccessor);
    this._secretKeyAccessor = secretKeyAccessor;
  }

  /**
   * @param {Array.<CustomEncryption>} customEncryption
   */
  setCustomEncryption(customEncryption) {
    const transformed = {};
    let currentVersion = null;
    customEncryption.forEach((encryption) => {
      if (SUPPORTED_VERSIONS.includes(encryption.version)) {
        throw new Error(`Custom encryption version must not correspond build-in encryption: ${encryption.version}`);
      }
      if (!/^[A-Za-z0-9_-]+$/.test(encryption.version)) {
        throw new Error('Custom encryption version must contain letters, numbers, - and _ signs only');
      }
      if (encryption.isCurrent) {
        if (currentVersion != null) {
          throw new Error('There must be at most one current version of custom encryption');
        }
        currentVersion = encryption.version;
      }
      transformed[encryption.version] = encryption;
    });

    this._crypto.setCustomEncryption(transformed, currentVersion);
  }

  /**
   * @param {CountriesCache | unknown} countriesCache
   */
  setCountriesCache(countriesCache) {
    if (!(countriesCache instanceof CountriesCache)) {
      throw new Error('You must pass an instance of CountriesCache');
    }
    this._countriesCache = countriesCache;
  }

  /**
   * @param {Error|string} errorOrMessage
   */
  logAndThrowError(errorOrMessage) {
    const error = isError(errorOrMessage) ? errorOrMessage : new Error(errorOrMessage);
    this._logger.write('error', error.message);
    throw error;
  }

  validate(...validationResults) {
    validationResults.filter(isError).slice(0, 1).forEach(this.logAndThrowError, this);
  }

  /**
   * @param {string} countryCode - Country code.
   * @param {Record} record
   * @return {Promise<{ record: Record }>} Matching record.
   */
  async write(countryCode, record) {
    this.validate(
      validateCountryCode(countryCode),
      validateRecord(record),
    );

    const data = await this.encryptPayload(record);

    this._logger.write('debug', `Raw data: ${JSON.stringify(data)}`);

    await this.apiClient.write(countryCode, data);

    return { record };
  }

  /**
   * Write many records at once
   * @param {string} countryCode
   * @param {Array<Record>} records
   */
  async batchWrite(countryCode, records) {
    this.validate(
      validateCountryCode(countryCode),
      validateRecordsNEA(records),
    );

    try {
      const encryptedRecords = await Promise.all(records.map((r) => this.encryptPayload(r)));

      await this.apiClient.batchWrite(countryCode, { records: encryptedRecords });

      return { records };
    } catch (err) {
      this.logAndThrowError(err);
    }
  }

  /**
   * @param {string} countryCode - Country code.
   * @param {number} limit - Find limit
   * @returns {Promise<{ meta: { migrated: number, totalLeft: number } }>}
   */
  async migrate(countryCode, limit) {
    this.validate(
      validateCountryCode(countryCode),
      validateLimit(limit),
    );

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
   * @return {Promise<{ meta: { total: number, count: number, limit: number, offset: number }, records: Array<Record> }>} Matching records.
   */
  async find(countryCode, filter, options = {}) {
    this.validate(
      validateCountryCode(countryCode),
      validateFindOptions(options),
    );

    const data = {
      filter: this.hashKeys(filter),
      options,
    };

    const responseData = await this.apiClient.find(countryCode, data);

    const result = {
      records: [],
      meta: {},
    };

    if (responseData) {
      result.meta = responseData.meta;
      result.records = await Promise.all(
        responseData.data.map((item) => this.decryptPayload(item)),
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
  async read(countryCode, recordKey) {
    this.validate(
      validateCountryCode(countryCode),
      validateRecordKey(recordKey),
    );

    const key = await this.createKeyHash(recordKey);

    const responseData = await this.apiClient.read(countryCode, key);

    this._logger.write('debug', `Raw data: ${JSON.stringify(responseData)}`);
    this._logger.write('debug', 'Decrypting...');
    const recordData = await this.decryptPayload(responseData);
    this._logger.write('debug', `Decrypted data: ${JSON.stringify(recordData)}`);

    return { record: recordData };
  }

  async encryptPayload(originalRecord) {
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

  hashKeys(originalRecord) {
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

  async decryptPayload(originalRecord) {
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
    this.validate(validateCountryCode(countryCode));

    if (options.override && doc.key) {
      return this.write(countryCode, { ...doc });
    }

    const result = await this.find(countryCode, filter, { limit: 1 });
    if (result.meta.total > 1) {
      this.logAndThrowError('Multiple records found');
    } else if (result.meta.total === 0) {
      this.logAndThrowError('Record not found');
    }

    const newData = {
      ...result.records[0],
      ...doc,
    };

    return this.write(countryCode, { ...newData });
  }

  async delete(countryCode, recordKey) {
    this.validate(
      validateCountryCode(countryCode),
      validateRecordKey(recordKey),
    );

    try {
      const key = await this.createKeyHash(recordKey);

      await this.apiClient.delete(countryCode, key);

      return { success: true };
    } catch (err) {
      this._logger.write('error', err);
      throw err;
    }
  }
}

module.exports = Storage;
