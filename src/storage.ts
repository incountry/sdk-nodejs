import 'dotenv/config';
import crypto from 'crypto';
import { ApiClient, RequestOptions, FindResponseMeta } from './api-client';
import * as defaultLogger from './logger';
import { CountriesCache } from './countries-cache';
import { SecretKeyAccessor } from './secret-key-accessor';
import { InCrypt } from './in-crypt';
import { StorageClientError, StorageCryptoError } from './errors';
import { isJSON } from './utils';
import { isValid, toStorageClientError, withDefault } from './validation/utils';
import { StorageRecordIO, StorageRecord } from './validation/record';
import { StorageRecordsNEAIO } from './validation/records';
import { CountryCodeIO } from './validation/country-code';
import { FindOptionsIO, FindOptions } from './validation/find-options';
import {
  FindFilterIO, FindFilter, FilterStringValue, FilterStringQueryIO, FilterStringValueIO,
} from './validation/find-filter';
import { LimitIO } from './validation/limit';
import { RecordKeyIO } from './validation/record-key';
import {
  StorageOptionsIO, StorageOptions,
} from './validation/storage-options';
import { CustomEncryptionConfig } from './validation/custom-encryption-configs';
import { validate } from './validation/validate-decorator';
import { LoggerIO } from './validation/logger';
import { AuthClient, getApiKeyAuthClient, OAuthClient } from './auth-client';
import { normalizeErrors } from './normalize-errors-decorator';

const FIND_LIMIT = 100;

type KEY_FOR_ENCRYPTION = 'key' | 'key2' | 'key3' | 'profile_key';
const KEYS_FOR_ENCRYPTION: KEY_FOR_ENCRYPTION[] = [
  'key',
  'key2',
  'key3',
  'profile_key',
];

type WriteResult = {
  record: StorageRecord;
};

type BatchWriteResult = {
  records: Array<StorageRecord>;
};

type MigrateResult = {
  meta: {
    migrated: number;
    totalLeft: number;
  };
};

type FindResult = {
  meta: FindResponseMeta;
  records: Array<StorageRecord>;
  errors?: Array<{ error: StorageCryptoError; rawData: StorageRecord }>;
};

type FindOneResult = {
  record: StorageRecord | null;
};

type ReadResult = {
  record: StorageRecord | null;
};

type DeleteResult = {
  success: true;
};

class Storage {
  envId: string;
  encryptionEnabled: boolean;
  apiClient: ApiClient;
  normalizeKeys: boolean;
  crypto: InCrypt;
  logger!: defaultLogger.Logger;
  countriesCache!: CountriesCache;
  authClient: AuthClient;

  constructor(options: StorageOptions, customEncryptionConfigs?: CustomEncryptionConfig[]) {
    const validationResult = StorageOptionsIO.decode(options);
    if (!isValid(validationResult)) {
      throw toStorageClientError('Storage.constructor() Validation Error: ')(validationResult);
    }

    this.setLogger(options.logger || defaultLogger.withBaseLogLevel('info'));

    const apiKey = options.apiKey || process.env.INC_API_KEY;
    if (options.oauth) {
      const clientId = options.oauth.clientId || process.env.INC_CLIENT_ID;
      if (!clientId) {
        throw new StorageClientError('Please pass clientId in options or set INC_CLIENT_ID env var');
      }

      const clientSecret = options.oauth.clientSecret || process.env.INC_CLIENT_SECRET;
      if (!clientSecret) {
        throw new StorageClientError('Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
      }

      const authUrl = options.oauth.authUrl || process.env.INC_AUTH_URL;

      this.authClient = new OAuthClient(clientId, clientSecret, authUrl);
    } else {
      if (!apiKey) {
        throw new StorageClientError('Please pass apiKey in options or set INC_API_KEY env var');
      }
      this.authClient = getApiKeyAuthClient(apiKey);
    }

    const envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!envId) {
      throw new StorageClientError('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
    }
    this.envId = envId;

    if (options.encrypt !== false) {
      this.encryptionEnabled = true;
      this.crypto = new InCrypt(new SecretKeyAccessor(options.getSecrets));
      if (customEncryptionConfigs !== undefined) {
        this.crypto.setCustomEncryption(customEncryptionConfigs);
      }
    } else {
      if (customEncryptionConfigs !== undefined) {
        throw new StorageClientError('Cannot use custom encryption when encryption is off');
      }
      this.encryptionEnabled = false;
      this.crypto = new InCrypt();
    }

    this.setCountriesCache(options.countriesCache || new CountriesCache());

    this.apiClient = new ApiClient(
      this.authClient,
      this.envId,
      options.endpoint,
      (level, message, meta) => this.logger.write(level, message, meta),
      () => this.countriesCache.getCountries(),
      options.endpointMask,
    );
    this.normalizeKeys = Boolean(options.normalizeKeys);
  }

  @validate(LoggerIO)
  setLogger(logger: defaultLogger.Logger): void {
    this.logger = logger;
  }

  setCountriesCache(countriesCache: CountriesCache): void {
    if (!(countriesCache instanceof CountriesCache)) {
      throw new StorageClientError('You must pass an instance of CountriesCache');
    }
    this.countriesCache = countriesCache;
  }

  @validate(CountryCodeIO, RecordKeyIO)
  @normalizeErrors()
  async read(countryCode: string, recordKey: string, requestOptions?: RequestOptions): Promise<ReadResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const responseData = await this.apiClient.read(countryCode, key, requestOptions);
    const recordData = await this.decryptPayload(responseData);
    return { record: recordData };
  }

  @validate(CountryCodeIO, StorageRecordIO)
  @normalizeErrors()
  async write(countryCode: string, record: StorageRecord, requestOptions?: RequestOptions): Promise<WriteResult> {
    const data = await this.encryptPayload(record);
    await this.apiClient.write(countryCode, data, requestOptions);
    return { record };
  }

  @validate(CountryCodeIO, StorageRecordsNEAIO)
  @normalizeErrors()
  async batchWrite(countryCode: string, records: Array<StorageRecord>): Promise<BatchWriteResult> {
    const encryptedRecords = await Promise.all(records.map((r) => this.encryptPayload(r)));
    await this.apiClient.batchWrite(countryCode, { records: encryptedRecords });
    return { records };
  }

  @validate(CountryCodeIO, withDefault(FindFilterIO, {}), withDefault(FindOptionsIO, {}))
  @normalizeErrors()
  async find(countryCode: string, filter: FindFilter = {}, options: FindOptions = {}, requestOptions?: RequestOptions): Promise<FindResult> {
    const data = {
      filter: this.hashFilterKeys(filter, ['profile_key', 'key', 'key2', 'key3']),
      options: { limit: FIND_LIMIT, offset: 0, ...options },
    };

    const responseData = await this.apiClient.find(countryCode, data, requestOptions);

    const result: FindResult = {
      records: [],
      meta: responseData.meta,
    };

    const decrypted = await Promise.all(
      responseData.data.map((item: StorageRecord) => this.decryptPayload(item).catch((e) => ({ error: e, rawData: item }))),
    );

    const errors: FindResult['errors'] = [];
    decrypted.forEach((item) => {
      if ('error' in item) {
        errors.push(item);
      } else {
        result.records.push(item);
      }
    });

    if (errors.length) {
      result.errors = errors;
    }

    return result;
  }

  async findOne(countryCode: string, filter: FindFilter, options: FindOptions = {}, requestOptions?: RequestOptions): Promise<FindOneResult> {
    const optionsWithLimit = { ...options, limit: 1 };
    const result = await this.find(countryCode, filter, optionsWithLimit, requestOptions);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  @validate(CountryCodeIO, RecordKeyIO)
  @normalizeErrors()
  async delete(countryCode: string, recordKey: string, requestOptions?: RequestOptions): Promise<DeleteResult> {
    try {
      const key = this.createKeyHash(this.normalizeKey(recordKey));

      await this.apiClient.delete(countryCode, key, requestOptions);

      return { success: true };
    } catch (err) {
      this.logger.write('error', err.message);
      throw err;
    }
  }

  @validate(CountryCodeIO, withDefault(LimitIO, FIND_LIMIT), withDefault(FindFilterIO, {}))
  @normalizeErrors()
  async migrate(countryCode: string, limit = FIND_LIMIT, _findFilter: FindFilter = {}): Promise<MigrateResult> {
    if (!this.encryptionEnabled) {
      throw new StorageClientError('Migration not supported when encryption is off');
    }

    const currentSecretVersion = await this.crypto.getCurrentSecretVersion();
    const findFilter = { ..._findFilter, version: { $not: currentSecretVersion } };
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

  async validate(): Promise<void> {
    await this.crypto.validate();
  }

  private normalizeKey(key: string | number): string {
    return this.normalizeKeys ? String(key).toLowerCase() : String(key);
  }

  createKeyHash(s: string): string {
    const stringToHash = `${s}:${this.envId}`;
    return crypto
      .createHash('sha256')
      .update(stringToHash, 'utf8')
      .digest('hex');
  }

  private hashFilterKey(filterKeyValue: FilterStringValue): FilterStringValue {
    if (Array.isArray(filterKeyValue)) {
      return filterKeyValue.map((v) => this.createKeyHash(this.normalizeKey(v)));
    }
    return this.createKeyHash(this.normalizeKey(filterKeyValue));
  }

  private hashFilterKeys(filter: FindFilter, keys: Array<keyof FindFilter>): FindFilter {
    const hashedFilter = { ...filter };
    keys.forEach((key: keyof FindFilter) => {
      const value = hashedFilter[key];
      if (FilterStringValueIO.is(value)) {
        hashedFilter[key] = this.hashFilterKey(value);
      } else if (FilterStringQueryIO.is(value) && value.$not !== undefined) {
        hashedFilter[key] = { $not: this.hashFilterKey(value.$not) };
      }
    });

    return hashedFilter;
  }

  async encryptPayload(originalRecord: StorageRecord): Promise<StorageRecord> {
    this.logger.write('debug', 'Encrypting...');
    this.logger.write('debug', JSON.stringify(originalRecord, null, 2));

    const record = { ...originalRecord };

    type EncryptedBody = {
      meta: Record<string, unknown>;
      payload?: string | null;
    };

    const body: EncryptedBody = {
      meta: {},
    };

    KEYS_FOR_ENCRYPTION.forEach((field) => {
      const value = record[field];
      if (value !== undefined) {
        body.meta[field] = value;
        if (typeof value === 'string') {
          record[field] = this.createKeyHash(this.normalizeKey(value));
        }
      }
    });

    if (record.body !== undefined) {
      body.payload = record.body;
    }

    const { message, secretVersion } = await this.crypto.encrypt(
      JSON.stringify(body),
    );
    record.body = message;
    record.version = secretVersion;
    this.logger.write('debug', 'Finished encryption');
    this.logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }

  async decryptPayload(originalRecord: StorageRecord): Promise<StorageRecord> {
    this.logger.write('debug', 'Start decrypting...');
    this.logger.write('debug', JSON.stringify(originalRecord, null, 2));
    const record = { ...originalRecord };

    if (typeof record.body === 'string') {
      record.body = await this.crypto.decrypt(
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
          KEYS_FOR_ENCRYPTION.forEach((field) => {
            if (bodyObj.meta[field] !== undefined) {
              record[field] = bodyObj.meta[field];
            }
          });
        }
      }
    }

    this.logger.write('debug', 'Finished decryption');
    this.logger.write('debug', JSON.stringify(record, null, 2));
    return record;
  }
}

async function createStorage(options: StorageOptions, customEncryptionConfigs?: CustomEncryptionConfig[]): Promise<Storage> {
  const s = new Storage(options, customEncryptionConfigs);
  await s.validate();
  return s;
}

export {
  WriteResult,
  BatchWriteResult,
  MigrateResult,
  FindResult,
  ReadResult,
  DeleteResult,
  Storage,
  createStorage,
};
