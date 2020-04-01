require('dotenv').config();
const crypto = require('crypto');
const { ApiClient } = require('./api-client');
const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt } = require('./in-crypt');
const { isError, StorageClientError } = require('./errors');
const { isJSON } = require('./utils');
const { validateRecord } = require('./validation/record');
const { validateRecordsNEA } = require('./validation/records');
const { validateCountryCode } = require('./validation/country-code');
const { validateFindOptions } = require('./validation/find-options');
const { validateLimit } = require('./validation/limit');
const { validateRecordKey } = require('./validation/record-key');
const { validateCustomEncryptionConfigs } = require('./validation/custom-encryption-configs');

/**
 * @typedef {import('./secret-key-accessor')} SecretKeyAccessor
 */

/**
 * @typedef {import('./secret-key-accessor').GetSecretCallback} GetSecretCallback
 */

/**
 * @typedef {import('./validation/custom-encryption-data').CustomEncryption} CustomEncryption
 */

/**
 * @typedef {import('./validation/record').Record} Record
 */

/**
 * @typedef {import('./countries-cache')} CountriesCache
 */

/**
 * @typedef StorageOptions
 * @property {string} apiKey
 * @property {string} environmentId
 * @property {string} endpoint
 * @property {boolean} encrypt
 * @property {boolean} normalizeKeys
 */

/**
* @typedef Logger
* @property {(logLevel: string, message: string, id?: string, timestamp?: string) => boolean} write
*/

const FIND_LIMIT = 100;

class Storage {
  /**
   * @param {StorageOptions} options
   * @param {GetSecretCallback | unknown} getSecretCallback
   * @param {Logger} logger
   * @param {CountriesCache} countriesCache
   */
  constructor(options, getSecretCallback, logger, countriesCache) {
    if (logger) {
      this.setLogger(logger);
    } else {
      this._logger = defaultLogger.withBaseLogLevel('info');
    }

    this._apiKey = options.apiKey || process.env.INC_API_KEY;
    if (!this._apiKey) {
      throw new StorageClientError('Please pass apiKey in options or set INC_API_KEY env var');
    }

    this._envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!this._envId) {
      throw new StorageClientError('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
    }

    this._endpoint = options.endpoint;

    if (options.encrypt !== false) {
      this._encryptionEnabled = true;
      this._crypto = new InCrypt(new SecretKeyAccessor(getSecretCallback));
    } else {
      this._encryptionEnabled = false;
      this._crypto = new InCrypt();
    }

    this.setCountriesCache(countriesCache || new CountriesCache());

    this.apiClient = new ApiClient(this._apiKey, this._envId, this._endpoint, (level, message) => this._logger.write(level, message), (...args) => this._countriesCache.getCountriesAsync(...args));
    this.normalizeKeys = options.normalizeKeys;
  }

  async initialize() {
    await this._crypto.initialize();
  }

  /**
   * @param {string} s
   */
  normalizeKey(s) {
    return this.normalizeKeys ? s.toLowerCase() : s;
  }

  /**
   * @param {string} s
   */
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
      throw new StorageClientError('Please specify a logger');
    }
    if (!logger.write || typeof logger.write !== 'function') {
      throw new StorageClientError('Logger must implement write function');
    }
    if (logger.write.length < 2) {
      throw new StorageClientError('Logger.write must have at least 2 parameters');
    }
    this._logger = logger;
  }

  /**
   * @param {Array<CustomEncryption>} customEncryptionConfigs
   */
  setCustomEncryption(customEncryptionConfigs) {
    if (this._encryptionEnabled !== true) {
      throw new StorageClientError('Cannot use custom encryption when encryption is off');
    }

    this.validate(
      'Storage.setCustomEncryption()',
      validateCustomEncryptionConfigs(customEncryptionConfigs),
    );

    this._crypto.setCustomEncryption(customEncryptionConfigs);
  }

  /**
   * @param {CountriesCache | unknown} countriesCache
   */
  setCountriesCache(countriesCache) {
    if (!(countriesCache instanceof CountriesCache)) {
      throw new StorageClientError('You must pass an instance of CountriesCache');
    }
    this._countriesCache = countriesCache;
  }

  /**
   * @param {Error|string} errorOrMessage
   */
  logAndThrowError(errorOrMessage) {
    const error = isError(errorOrMessage) ? errorOrMessage : new StorageClientError(errorOrMessage);
    this._logger.write('error', error.message);
    throw error;
  }

  /**
   * @param {string} context
   * @param {Array<Error|unknown>} validationResults
   */
  validate(context, ...validationResults) {
    validationResults
      .filter(isError)
      .slice(0, 1)
      .map((error) => {
        /* eslint-disable-next-line no-param-reassign */
        error.message = `${context} Validation Error: ${error.message}`;
        return error;
      })
      .forEach(this.logAndThrowError, this);
  }

  /**
   * @param {string} countryCode - Country code
   * @param {Record} record
   * @param {object} [requestOptions]
   * @return {Promise<{ record: Record }>} Written record
   */
  async write(countryCode, record, requestOptions = {}) {
    this.validate(
      'Storage.write()',
      validateCountryCode(countryCode),
      validateRecord(record),
    );

    const data = await this.encryptPayload(record);

    await this.apiClient.write(countryCode, data, requestOptions);

    return { record };
  }

  /**
   * Write many records at once
   * @param {string} countryCode
   * @param {Array<Record>} records
   * @return {Promise<{ records: Array<Record> }>} Written records
   */
  async batchWrite(countryCode, records) {
    this.validate(
      'Storage.batchWrite()',
      validateCountryCode(countryCode),
      validateRecordsNEA(records),
    );

    try {
      const encryptedRecords = await Promise.all(records.map((r) => this.encryptPayload(r)));
      await this.apiClient.batchWrite(countryCode, { records: encryptedRecords });
    } catch (err) {
      this.logAndThrowError(err);
    }
    return { records };
  }

  /**
   * @param {string} countryCode - Country code.
   * @param {number} limit - Find limit
   * @returns {Promise<{ meta: { migrated: number, totalLeft: number } }>}
   */
  async migrate(countryCode, limit = FIND_LIMIT, findFilterOptional = {}) {
    this.validate(
      'Storage.migrate()',
      validateCountryCode(countryCode),
      validateLimit(limit),
    );

    if (!this._encryptionEnabled) {
      throw new StorageClientError('Migration not supported when encryption is off');
    }

    const currentSecretVersion = await this._crypto.getCurrentSecretVersion();
    const findFilter = { ...findFilterOptional, version: { $not: currentSecretVersion } };
    const findOptions = { limit };
    const { records, meta, errors } = await this.find(countryCode, findFilter, findOptions);
    if (records.length === 0 && errors && errors[0]) {
      throw errors[0].error;
    }

    await this.batchWrite(countryCode, records);

    return {
      meta: {
        migrated: meta.count,
        totalLeft: meta.total - meta.count,
      },
    };
  }

  /**
   * @typedef {string | Array<string> | { $not: string | Array<string> }} FilterStringValue
  */

  /**
   * @typedef { number | Array<number> | { $not: number | Array<number> } | { $gt?: number, $gte?: number, $lt?: number, $lte?: number }} FilterNumberValue
  */

  /**
   * @typedef {Object.<string,{FilterStringValue | FilterNumberValue}>} FindFilter
  */

  /**
   * @typedef FindResultsMeta
   * @property {number} total
   * @property {number} count
   * @property {number} limit
   * @property {number} offset
   */

  /**
   * Find records matching filter.
   * @param {string} countryCode - Country code.
   * @param {FindFilter} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @param {object} [requestOptions]
   * @return {Promise<{ meta: FindResultsMeta }, records: Array<Record>, errors?: Array<{ error: InCryptoError, rawData: Record  }> } Matching records.
   */
  async find(countryCode, filter, options = {}, requestOptions = {}) {
    this.validate(
      'Storage.find()',
      validateCountryCode(countryCode),
      validateFindOptions(options),
    );

    const data = {
      filter: this.hashFilterKeys(filter),
      options: { limit: FIND_LIMIT, offset: 0, ...options },
    };

    const responseData = await this.apiClient.find(countryCode, data, requestOptions);

    const result = {
      records: [],
      meta: {},
    };

    if (responseData) {
      result.meta = responseData.meta;

      const decrypted = await Promise.all(
        responseData.data.map((item) => this.decryptPayload(item).catch((e) => ({ error: e, rawData: item }))),
      );

      const errors = [];
      decrypted.forEach((item) => {
        if (item.error) {
          errors.push(item);
        } else {
          result.records.push(item);
        }
      });

      if (errors.length) {
        result.errors = errors;
      }
    }

    return result;
  }

  hashFilterKeys(filter) {
    const hashedFilter = { ...filter };
    ['profile_key', 'key', 'key2', 'key3'].forEach((field) => {
      if (hashedFilter[field] != null) {
        if (Array.isArray(hashedFilter[field])) {
          hashedFilter[field] = hashedFilter[field].map((v) => this.createKeyHash(this.normalizeKey(v)));
        } else {
          hashedFilter[field] = this.createKeyHash(this.normalizeKey(hashedFilter[field]));
        }
      }
    });
    return hashedFilter;
  }

  /**
   * Find first record matching filter.
   * @param {string} countryCode - Country code.
   * @param {FindFilter} filter - The filter to apply.
   * @param {{ limit: number, offset: number }} options - The options to pass to PoP.
   * @param {object} [requestOptions]
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async findOne(countryCode, filter, options = {}, requestOptions = {}) {
    const result = await this.find(countryCode, filter, options, requestOptions);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  /**
   * @param {string} countryCode Country code
   * @param {string} recordKey
   * @param {object} [requestOptions]
   * @return {Promise<{ record: Record|null }>} Matching record
   */
  async read(countryCode, recordKey, requestOptions = {}) {
    this.validate(
      'Storage.read()',
      validateCountryCode(countryCode),
      validateRecordKey(recordKey),
    );

    const key = await this.createKeyHash(this.normalizeKey(recordKey));

    const responseData = await this.apiClient.read(countryCode, key, requestOptions);

    const recordData = await this.decryptPayload(responseData);

    return { record: recordData };
  }

  async encryptPayload(originalRecord) {
    this._logger.write('debug', 'Encrypting...');
    this._logger.write('debug', JSON.stringify(originalRecord, null, 2));

    const record = { ...originalRecord };
    const body = {
      meta: {},
    };
    ['profile_key', 'key', 'key2', 'key3'].forEach((field) => {
      if (record[field] !== undefined) {
        body.meta[field] = record[field];
        record[field] = this.createKeyHash(this.normalizeKey(record[field]));
      }
    });
    if (record.body !== undefined) {
      body.payload = record.body;
    }

    const { message, secretVersion } = await this._crypto.encrypt(
      JSON.stringify(body),
    );
    record.body = message;
    record.version = secretVersion;
    this._logger.write('debug', 'Finished encryption');
    this._logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }

  /**
   * @param {Record} originalRecord
   */
  async decryptPayload(originalRecord) {
    this._logger.write('debug', 'Start decrypting...');
    this._logger.write('debug', JSON.stringify(originalRecord, null, 2));
    const record = { ...originalRecord };

    if (typeof record.body === 'string') {
      record.body = await this._crypto.decrypt(
        record.body,
        record.version,
      );

      if (isJSON(record.body)) {
        const bodyObj = JSON.parse(record.body);

        if (bodyObj.payload !== undefined) {
          record.body = bodyObj.payload;
        } else {
          record.body = null;
        }

        if (bodyObj.meta !== undefined) {
          Object.keys(bodyObj.meta).forEach((key) => {
            record[key] = bodyObj.meta[key];
          });
        }
      }
    }

    this._logger.write('debug', 'Finished decryption');
    this._logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }

  /**
   * Update a record matching filter.
   * @param {string} countryCode - Country code.
   * @param {object} filter - The filter to apply.
   * @param {object} doc - New values to be set in matching records.
   * @param {object} options - Options object.
   * @param {object} [requestOptions]
   * @return {Promise<{ record: Record }>} Operation result.
   */
  async updateOne(countryCode, filter, doc, options = { override: false }, requestOptions = {}) {
    this.validate(
      'Storage.updateOne()',
      validateCountryCode(countryCode),
    );

    if (options.override && doc.key) {
      return this.write(countryCode, { ...doc }, requestOptions);
    }

    const result = await this.find(countryCode, filter, { limit: 1 }, requestOptions);
    if (result.meta.total > 1) {
      this.logAndThrowError('Multiple records found');
    } else if (result.meta.total === 0) {
      this.logAndThrowError('Record not found');
    }

    const newData = {
      ...result.records[0],
      ...doc,
    };

    return this.write(countryCode, { ...newData }, requestOptions);
  }
  /**
   * Delete a record by ket.
   * @param {string} countryCode - Country code.
   * @param {string} recordKey
   * @param {object} [requestOptions]
   * @return {Promise<{ success: true }>} Operation result.
   */
  async delete(countryCode, recordKey, requestOptions = {}) {
    this.validate(
      'Storage.delete()',
      validateCountryCode(countryCode),
      validateRecordKey(recordKey),
    );

    try {
      const key = await this.createKeyHash(this.normalizeKey(recordKey));

      await this.apiClient.delete(countryCode, key, requestOptions);

      return { success: true };
    } catch (err) {
      this._logger.write('error', err);
      throw err;
    }
  }
}


/**
 * @param {StorageOptions} options
 * @param {GetSecretCallback | unknown} getSecretCallback
 * @param {Logger} logger
 * @param {CountriesCache} countriesCache
 * @returns {Promise<Storage>}
 */
async function createStorage(options, getSecretCallback, logger, countriesCache) {
  const s = new Storage(options, getSecretCallback, logger, countriesCache);
  await s.initialize();
  return s;
}

module.exports = createStorage;
