require('dotenv').config();
const crypto = require('crypto');
const { ApiClient } = require('./api-client');
const defaultLogger = require('./logger');
const CountriesCache = require('./countries-cache');
const SecretKeyAccessor = require('./secret-key-accessor');
const { InCrypt } = require('./in-crypt');
const { isError, StorageClientError } = require('./errors');
const { isJSON } = require('./utils');
const { isValid, toStorageClientError } = require('./validation/utils');
const { RecordIO } = require('./validation/record');
const { RecordsNEAIO } = require('./validation/records');
const { CountryCodeIO } = require('./validation/country-code');
const { FindOptionsIO } = require('./validation/find-options');
const { FindFilterIO } = require('./validation/find-filter');
const { LimitIO } = require('./validation/limit');
const { RecordKeyIO } = require('./validation/record-key');
const { StorageOptionsIO, LoggerIO } = require('./validation/storage-options');

/**
 * @typedef {import('./secret-key-accessor')} SecretKeyAccessor
 */

/**
 * @typedef {import('./secret-key-accessor').GetSecretsCallback} GetSecretsCallback
 */

/**
 * @typedef {import('./api-client').RequestOptions} RequestOptions
 */

/**
 * @typedef {import('./validation/custom-encryption-data').CustomEncryptionConfig} CustomEncryptionConfig
 */

/**
 * @typedef {import('./validation/record').Record} Record
 */

/**
 * @typedef {import('./countries-cache')} CountriesCache
 */

/**
 * @typedef {import('./validation/storage-options').StorageOptions} StorageOptions
 */

/**
 * @typedef {import('./validation/storage-options').Logger} Logger
 */

const FIND_LIMIT = 100;

const KEYS_FOR_ENCRYPTION = [
  'key',
  'key2',
  'key3',
  'profile_key',
];

class Storage {
  /**
   * @param {StorageOptions} options

   */
  constructor(options) {
    const validationResult = StorageOptionsIO.decode(options);
    if (!isValid(validationResult)) {
      throw toStorageClientError('Storage.constructor() Validation Error: ')(validationResult);
    }

    this.setLogger(options.logger || defaultLogger.withBaseLogLevel('info'));

    const apiKey = options.apiKey || process.env.INC_API_KEY;
    if (!apiKey) {
      throw new StorageClientError('Please pass apiKey in options or set INC_API_KEY env var');
    }

    const envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!envId) {
      throw new StorageClientError('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
    }

    if (options.encrypt !== false) {
      this._encryptionEnabled = true;
      this._crypto = new InCrypt(new SecretKeyAccessor(options.getSecrets));
    } else {
      this._encryptionEnabled = false;
      this._crypto = new InCrypt();
    }

    this.setCountriesCache(options.countriesCache || new CountriesCache());

    this.apiClient = new ApiClient(apiKey, envId, options.endpoint, (level, message) => this._logger.write(level, message), (...args) => this._countriesCache.getCountriesAsync(...args));
    this.normalizeKeys = options.normalizeKeys;
  }

  /**
   * @param {Array<CustomEncryptionConfig>} customEncryptionConfigs
   */
  async initialize(customEncryptionConfigs) {
    if (customEncryptionConfigs && this._encryptionEnabled !== true) {
      throw new StorageClientError('Cannot use custom encryption when encryption is off');
    }

    await this._crypto.initialize(customEncryptionConfigs);
  }

  /**
   * @param {string|null} s
   */
  normalizeKey(s) {
    return this.normalizeKeys && typeof s === 'string' ? s.toLowerCase() : s;
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
    this.validate(
      'Storage.setLogger()',
      LoggerIO.decode(logger),
    );
    this._logger = logger;
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
   * @param {Array<unknown>} validationResults
   */
  validate(context, ...validationResults) {
    validationResults
      .filter((result) => !isValid(result))
      .slice(0, 1)
      .map(toStorageClientError(`${context} Validation Error: `))
      .forEach(this.logAndThrowError, this);
  }

  /**
   * @param {string} countryCode - Country code
   * @param {Record} recordData
   * @param {RequestOptions} [requestOptions]
   * @return {Promise<{ record: Record }>} Written record
   */
  async write(countryCode, recordData, requestOptions = {}) {
    const recordValidationResult = RecordIO.decode(recordData);
    this.validate(
      'Storage.write()',
      CountryCodeIO.decode(countryCode),
      recordValidationResult,
    );

    const record = recordValidationResult.right;
    const data = await this.encryptPayload(record);
    await this.apiClient.write(countryCode, data, requestOptions);
    return { record };
  }

  /**
   * Write many records at once
   * @param {string} countryCode
   * @param {Array<Record>} recordsData
   * @return {Promise<{ records: Array<Record> }>} Written records
   */
  async batchWrite(countryCode, recordsData) {
    const recordsValidationResult = RecordsNEAIO.decode(recordsData);

    this.validate(
      'Storage.batchWrite()',
      CountryCodeIO.decode(countryCode),
      recordsValidationResult,
    );

    const records = recordsValidationResult.right;
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
      CountryCodeIO.decode(countryCode),
      LimitIO.decode(limit),
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
   * @typedef FindOptions
   * @property {number} limit
   * @property {number} offset
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
   * @param {FindOptions} options - The options to pass to PoP.
   * @param {RequestOptions} [requestOptions]
   * @return {Promise<{ meta: FindResultsMeta }, records: Array<Record>, errors?: Array<{ error: InCryptoError, rawData: Record  }> } Matching records.
   */
  async find(countryCode, filter, options = {}, requestOptions = {}) {
    this.validate(
      'Storage.find()',
      CountryCodeIO.decode(countryCode),
      FindFilterIO.decode(filter),
      FindOptionsIO.decode(options),
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
   * @param {FindOptions} options - The options to pass to PoP.
   * @param {RequestOptions} [requestOptions]
   * @return {Promise<{ record: Record|null }>} Matching record.
   */
  async findOne(countryCode, filter, options = {}, requestOptions = {}) {
    const optionsWithLimit = { ...options, limit: 1 };
    const result = await this.find(countryCode, filter, optionsWithLimit, requestOptions);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  /**
   * @param {string} countryCode Country code
   * @param {string} recordKey
   * @param {RequestOptions} [requestOptions]
   * @return {Promise<{ record: Record|null }>} Matching record
   */
  async read(countryCode, recordKey, requestOptions = {}) {
    this.validate(
      'Storage.read()',
      CountryCodeIO.decode(countryCode),
      RecordKeyIO.decode(recordKey),
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
    KEYS_FOR_ENCRYPTION.forEach((field) => {
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
   * Delete a record by ket.
   * @param {string} countryCode - Country code.
   * @param {string} recordKey
   * @param {RequestOptions} [requestOptions]
   * @return {Promise<{ success: true }>} Operation result.
   */
  async delete(countryCode, recordKey, requestOptions = {}) {
    this.validate(
      'Storage.delete()',
      CountryCodeIO.decode(countryCode),
      RecordKeyIO.decode(recordKey),
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
 * @param {Array<CustomEncryptionConfig>} [customEncryptionConfigs]
 * @returns {Promise<Storage>}
 */
async function createStorage(options, customEncryptionConfigs) {
  const s = new Storage(options);
  await s.initialize(customEncryptionConfigs);
  return s;
}

module.exports = createStorage;
