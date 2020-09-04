import 'dotenv/config';
import crypto from 'crypto';
import { ApiClient } from './api-client';
import * as defaultLogger from './logger';
import { CountriesCache } from './countries-cache';
import { SecretKeyAccessor } from './secret-key-accessor';
import { InCrypt } from './in-crypt';
import { StorageClientError, StorageCryptoError, StorageServerError } from './errors';
import {
  isValid, toStorageClientError, optional, getErrorMessage,
} from './validation/utils';
import { StorageRecord, fromApiRecord } from './validation/storage-record';
import { StorageRecordDataArrayIO } from './validation/storage-record-data-array';
import { CountryCodeIO } from './validation/country-code';
import { FindOptionsIO, FindOptions } from './validation/api/find-options';
import {
  FindFilterIO, FindFilter, FilterStringValue, FilterStringQueryIO, FilterStringValueIO, filterFromStorageDataKeys,
} from './validation/api/find-filter';
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
import { FindResponseMeta } from './validation/api/find-response';
import { ApiRecord, ApiRecordBodyIO } from './validation/api/api-record';
import { StorageRecordData, StorageRecordDataIO } from './validation/storage-record-data';
import { ApiRecordData, apiRecordDataFromStorageRecordData } from './validation/api/api-record-data';
import { RequestOptionsIO, RequestOptions } from './validation/request-options';

const FIND_LIMIT = 100;

type KEY_TO_HASH =
  | 'record_key'
  | 'key1'
  | 'key2'
  | 'key3'
  | 'key4'
  | 'key5'
  | 'key6'
  | 'key7'
  | 'key8'
  | 'key9'
  | 'key10'
  | 'service_key1'
  | 'service_key2'
  | 'profile_key';

const KEYS_TO_HASH: KEY_TO_HASH[] = [
  'record_key',
  'key1',
  'key2',
  'key3',
  'key4',
  'key5',
  'key6',
  'key7',
  'key8',
  'key9',
  'key10',
  'service_key1',
  'service_key2',
  'profile_key',
];

type BodyForEncryption = {
  meta: Record<string, unknown>;
  payload?: string | null;
};

type WriteResult = {
  record: StorageRecordData;
};

type BatchWriteResult = {
  records: Array<StorageRecordData>;
};

type MigrateResult = {
  meta: {
    migrated: number;
    totalLeft: number;
    errors?: Array<{ error: StorageCryptoError; rawData: ApiRecord }>;
  };
};

type FindResult = {
  meta: FindResponseMeta;
  records: Array<StorageRecord>;
  errors?: Array<{ error: StorageCryptoError; rawData: ApiRecord }>;
};

type FindOneResult = {
  record: StorageRecord | null;
};

type ReadResult = {
  record: StorageRecord;
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
    let clientId = process.env.INC_CLIENT_ID;
    let clientSecret = process.env.INC_CLIENT_SECRET;
    let authEndpoints;
    if (options.oauth) {
      clientId = options.oauth.clientId || clientId;
      clientSecret = options.oauth.clientSecret || clientSecret;
      authEndpoints = options.oauth.authEndpoints;
    }
    if (clientId || clientSecret) {
      if (!clientId) {
        throw new StorageClientError('Please pass clientId in options or set INC_CLIENT_ID env var');
      }

      if (!clientSecret) {
        throw new StorageClientError('Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
      }

      this.authClient = new OAuthClient(clientId, clientSecret, authEndpoints);
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
      if (options.getSecrets === undefined) {
        throw new StorageClientError('Provide callback function for secretData');
      }
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

    this.setCountriesCache(options.countriesCache || new CountriesCache(options.countriesEndpoint));

    this.apiClient = new ApiClient(
      this.authClient,
      this.envId,
      options.endpoint,
      (level, message, meta) => this.logger.write(level, message, meta),
      (loggingMeta: {}) => this.countriesCache.getCountries(undefined, loggingMeta),
      options.endpointMask,
      options.httpOptions ? options.httpOptions.timeout : undefined,
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

  @validate(CountryCodeIO, RecordKeyIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async read(countryCode: string, recordKey: string, requestOptions: RequestOptions = {}): Promise<ReadResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const responseData = await this.apiClient.read(countryCode, key, requestOptions);
    const record = await this.decryptPayload(responseData, requestOptions.meta);
    return { record };
  }

  @validate(CountryCodeIO, StorageRecordDataIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async write(countryCode: string, recordData: StorageRecordData, requestOptions: RequestOptions = {}): Promise<WriteResult> {
    const data = await this.encryptPayload(recordData, requestOptions.meta);
    await this.apiClient.write(countryCode, data, requestOptions);
    return { record: recordData };
  }

  @validate(CountryCodeIO, StorageRecordDataArrayIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async batchWrite(countryCode: string, records: Array<StorageRecordData>, requestOptions: RequestOptions = {}): Promise<BatchWriteResult> {
    const encryptedRecords = await Promise.all(records.map((r) => this.encryptPayload(r, requestOptions.meta)));
    await this.apiClient.batchWrite(countryCode, { records: encryptedRecords }, requestOptions);
    return { records };
  }

  @validate(CountryCodeIO, optional(FindFilterIO), optional(FindOptionsIO), optional(RequestOptionsIO))
  @normalizeErrors()
  async find(countryCode: string, filter: FindFilter = {}, options: FindOptions = {}, requestOptions: RequestOptions = {}): Promise<FindResult> {
    const data = {
      filter: this.hashFilterKeys(filterFromStorageDataKeys(filter), KEYS_TO_HASH),
      options: { limit: FIND_LIMIT, offset: 0, ...options },
    };

    const responseData = await this.apiClient.find(countryCode, data, requestOptions);

    const result: FindResult = {
      records: [],
      meta: responseData.meta,
    };

    const decrypted = await Promise.all(
      responseData.data.map((item) => this.decryptPayload(item, requestOptions.meta).catch((ex) => ({ error: ex, rawData: item }))),
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

  @validate(CountryCodeIO, optional(FindFilterIO), optional(FindOptionsIO), optional(RequestOptionsIO))
  @normalizeErrors()
  async findOne(countryCode: string, filter: FindFilter = {}, options: FindOptions = {}, requestOptions: RequestOptions = {}): Promise<FindOneResult> {
    const optionsWithLimit = { ...options, limit: 1 };
    const result = await this.find(countryCode, filter, optionsWithLimit, requestOptions);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  @validate(CountryCodeIO, RecordKeyIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async delete(countryCode: string, recordKey: string, requestOptions: RequestOptions = {}): Promise<DeleteResult> {
    try {
      const key = this.createKeyHash(this.normalizeKey(recordKey));

      await this.apiClient.delete(countryCode, key, requestOptions);

      return { success: true };
    } catch (err) {
      this.logger.write('error', err.message, requestOptions.meta);
      throw err;
    }
  }

  @validate(CountryCodeIO, optional(LimitIO), optional(FindFilterIO), optional(RequestOptionsIO))
  @normalizeErrors()
  async migrate(countryCode: string, limit = FIND_LIMIT, _findFilter: FindFilter = {}, requestOptions: RequestOptions = {}): Promise<MigrateResult> {
    if (!this.encryptionEnabled) {
      throw new StorageClientError('Migration not supported when encryption is off');
    }

    const currentSecretVersion = await this.crypto.getCurrentSecretVersion();
    const findFilter = { ..._findFilter, version: { $not: currentSecretVersion } };
    const findOptions = { limit };
    const { records, meta, errors } = await this.find(countryCode, findFilter, findOptions, requestOptions);
    if (records.length > 0) {
      await this.batchWrite(countryCode, records, requestOptions);
    }

    const result: MigrateResult = {
      meta: {
        migrated: meta.count,
        totalLeft: meta.total - meta.count,
      },
    };

    if (errors) {
      result.meta.errors = errors;
    }

    return result;
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

  async encryptPayload(storageRecordData: StorageRecordData, loggingMeta?: {}): Promise<ApiRecordData> {
    this.logger.write('debug', 'Encrypting...', loggingMeta);
    this.logger.write('debug', JSON.stringify(storageRecordData, null, 2), loggingMeta);

    const recordData: ApiRecordData = apiRecordDataFromStorageRecordData(storageRecordData);

    const body: BodyForEncryption = {
      meta: {},
      payload: null,
    };

    KEYS_TO_HASH.forEach((field) => {
      const value = recordData[field];
      if (value !== undefined) {
        body.meta[field] = value;
        if (value !== null) {
          recordData[field] = this.createKeyHash(this.normalizeKey(value));
        }
      }
    });

    if (typeof recordData.body === 'string') {
      body.payload = recordData.body;
    }

    if (typeof recordData.precommit_body === 'string') {
      const { message: encryptedPrecommitBody } = await this.crypto.encrypt(recordData.precommit_body);
      recordData.precommit_body = encryptedPrecommitBody;
    }

    const { message, secretVersion } = await this.crypto.encrypt(JSON.stringify(body));
    recordData.body = message;
    recordData.version = secretVersion;
    recordData.is_encrypted = this.encryptionEnabled;

    this.logger.write('debug', 'Finished encryption', loggingMeta);
    this.logger.write('debug', JSON.stringify(recordData, null, 2), loggingMeta);
    return recordData;
  }

  async decryptPayload(apiRecord: ApiRecord, loggingMeta?: {}): Promise<StorageRecord> {
    this.logger.write('debug', 'Start decrypting...', loggingMeta);
    this.logger.write('debug', JSON.stringify(apiRecord, null, 2), loggingMeta);

    const record = {
      ...apiRecord,
    };

    if (typeof apiRecord.precommit_body === 'string') {
      record.precommit_body = await this.crypto.decrypt(apiRecord.precommit_body, apiRecord.version);
    }

    const decryptedBody = await this.crypto.decrypt(apiRecord.body, apiRecord.version);

    const bodyObj = ApiRecordBodyIO.decode(decryptedBody);
    if (!isValid(bodyObj)) {
      throw new StorageServerError(`Invalid record body: ${getErrorMessage(bodyObj)}`);
    }
    const { payload, meta } = bodyObj.right;

    KEYS_TO_HASH.forEach((field) => {
      const fieldValue = meta[field];
      if (typeof fieldValue === 'string') {
        record[field] = fieldValue;
      }
    });

    // For older records
    if (typeof meta.key === 'string') {
      record.record_key = meta.key;
    }

    const storageRecord = {
      ...fromApiRecord(record),
      body: payload !== undefined ? payload : null,
    };

    this.logger.write('debug', 'Finished decryption', loggingMeta);
    this.logger.write('debug', JSON.stringify(storageRecord, null, 2), loggingMeta);
    return storageRecord;
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
  KEY_TO_HASH,
  KEYS_TO_HASH,
  createStorage,
  FIND_LIMIT,
};
