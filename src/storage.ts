import 'dotenv/config';
import crypto from 'crypto';
import * as t from 'io-ts';
import { createReadStream, ReadStream } from 'fs';
import { basename } from 'path';
import { ApiClient, GetAttachmentFileResponse } from './api-client';
import * as defaultLogger from './logger';
import { CountriesCache } from './countries-cache';
import { SecretKeyAccessor } from './secret-key-accessor';
import { InCrypt } from './in-crypt';
import {
  InputValidationError,
  StorageConfigValidationError,
  StorageCryptoError,
} from './errors';
import {
  isInvalid, optional,
  toStorageConfigValidationError,
  toStorageServerError,
} from './validation/utils';
import {
  StorageRecord,
  fromApiRecord,
  StorageRecordAttachment,
  fromApiRecordAttachment,
} from './validation/storage-record';
import { getStorageRecordDataArrayIO } from './validation/user-input/storage-record-data-array';
import { CountryCodeIO } from './validation/user-input/country-code';
import {
  FindOptionsIO, FindOptions, SEARCH_KEYS, SearchKey,
} from './validation/user-input/find-options';
import {
  FindFilterIO, FindFilter, FilterStringValue, FilterStringQueryIO, FilterStringValueIO,
} from './validation/user-input/find-filter';
import { LimitIO } from './validation/user-input/limit';
import { RecordKeyIO } from './validation/user-input/record-key';
import {
  StorageOptionsIO, StorageOptions,
} from './validation/user-input/storage-options';
import { CustomEncryptionConfig } from './validation/user-input/custom-encryption-configs';
import { validate } from './validation/validate-decorator';
import { LoggerIO } from './validation/user-input/logger';
import { AuthClient, getStaticTokenAuthClient, OAuthClient } from './auth-client';
import { normalizeErrors } from './normalize-errors-decorator';
import { FindResponseMeta } from './validation/api/find-response';
import { ApiRecord, ApiRecordBodyIO } from './validation/api/api-record';
import { StorageRecordData, getStorageRecordDataIO } from './validation/user-input/storage-record-data';
import { ApiRecordData, apiRecordDataFromStorageRecordData } from './validation/api/api-record-data';
import { RequestOptionsIO, RequestOptions } from './validation/user-input/request-options';
import { AttachmentWritableMeta, AttachmentWritableMetaIO } from './validation/user-input/attachment-writable-meta';
import { AttachmentData, AttachmentDataIO } from './validation/user-input/attachment-data';
import { findOptionsFromStorageDataKeys } from './validation/api/api-find-options';
import { filterFromStorageDataKeys, ApiFindFilter } from './validation/api/api-find-filter';

const FIND_LIMIT = 100;

type KeyToHash =
  | 'record_key'
  | 'service_key1'
  | 'service_key2'
  | 'service_key3'
  | 'service_key4'
  | 'service_key5'
  | 'profile_key'
  | 'parent_key';

const KEYS_TO_HASH: KeyToHash[] = [
  'record_key',
  'service_key1',
  'service_key2',
  'service_key3',
  'service_key4',
  'service_key5',
  'profile_key',
  'parent_key',
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

type AddAttachmentResult = {
  attachmentMeta: StorageRecordAttachment;
}

type GetAttachmentMetaResult = {
  attachmentMeta: StorageRecordAttachment;
}

type UpdateAttachmentMetaResult = {
  attachmentMeta: StorageRecordAttachment;
}

type GetAttachmentFileResult = {
  attachmentData: GetAttachmentFileResponse;
}

class Storage {
  envId: string;
  encryptionEnabled: boolean;
  apiClient: ApiClient;
  normalizeKeys: boolean;
  crypto: InCrypt;
  logger!: defaultLogger.Logger;
  countriesCache!: CountriesCache;
  authClient: AuthClient;
  hashSearchKeys: boolean;

  constructor(options: StorageOptions, customEncryptionConfigs?: CustomEncryptionConfig[]) {
    const validationResult = StorageOptionsIO.decode(options);
    if (isInvalid(validationResult)) {
      throw toStorageConfigValidationError('Storage.constructor() Validation Error: ')(validationResult);
    }

    this.setLogger(options.logger || defaultLogger.withBaseLogLevel('info'));

    this.authClient = this.getAuthClient(options);

    const envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!envId) {
      throw new StorageConfigValidationError('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
    }
    this.envId = envId;

    this.hashSearchKeys = options.hashSearchKeys === undefined ? true : options.hashSearchKeys;

    if (options.encrypt !== false) {
      if (options.getSecrets === undefined) {
        throw new StorageConfigValidationError('Provide callback function for secretData');
      }
      this.encryptionEnabled = true;
      this.crypto = new InCrypt(new SecretKeyAccessor(options.getSecrets));
      if (customEncryptionConfigs !== undefined) {
        this.crypto.setCustomEncryption(customEncryptionConfigs);
      }
    } else {
      if (customEncryptionConfigs !== undefined) {
        throw new StorageConfigValidationError('Cannot use custom encryption when encryption is off');
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
      throw new InputValidationError('You must pass an instance of CountriesCache');
    }
    this.countriesCache = countriesCache;
  }

  @validate(CountryCodeIO, RecordKeyIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async read(
    countryCode: string,
    recordKey: string,
    requestOptions: RequestOptions = {},
  ): Promise<ReadResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const responseData = await this.apiClient.read(countryCode, key, requestOptions);
    const record = await this.decryptPayload(responseData, requestOptions.meta);
    return { record };
  }

  @validate(CountryCodeIO, getStorageRecordDataIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async write(
    countryCode: string,
    recordData: StorageRecordData,
    requestOptions: RequestOptions = {},
  ): Promise<WriteResult> {
    const data = await this.encryptPayload(recordData, requestOptions.meta);
    await this.apiClient.write(countryCode, data, requestOptions);
    return { record: recordData };
  }

  @validate(CountryCodeIO, getStorageRecordDataArrayIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async batchWrite(
    countryCode: string,
    records: Array<StorageRecordData>,
    requestOptions: RequestOptions = {},
  ): Promise<BatchWriteResult> {
    const encryptedRecords = await Promise.all(records.map((r) => this.encryptPayload(r, requestOptions.meta)));
    await this.apiClient.batchWrite(countryCode, { records: encryptedRecords }, requestOptions);
    return { records };
  }

  @validate(CountryCodeIO, optional(FindFilterIO), optional(FindOptionsIO), optional(RequestOptionsIO))
  @normalizeErrors()
  async find(
    countryCode: string,
    filter: FindFilter = {},
    options: FindOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<FindResult> {
    const keysToHash = this.getKeysToHash();

    const data = {
      filter: this.hashFilterKeys(filterFromStorageDataKeys(filter), keysToHash),
      options: { limit: FIND_LIMIT, offset: 0, ...findOptionsFromStorageDataKeys(options) },
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
  async findOne(
    countryCode: string,
    filter: FindFilter = {},
    options: FindOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<FindOneResult> {
    const optionsWithLimit = { ...options, limit: 1 };
    const result = await this.find(countryCode, filter, optionsWithLimit, requestOptions);
    const record = result.records.length ? result.records[0] : null;
    return { record };
  }

  @validate(CountryCodeIO, RecordKeyIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async delete(countryCode: string, recordKey: string, requestOptions: RequestOptions = {}): Promise<DeleteResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    await this.apiClient.delete(countryCode, key, requestOptions);
    return { success: true };
  }

  @validate(CountryCodeIO, optional(LimitIO), optional(FindFilterIO), optional(RequestOptionsIO))
  @normalizeErrors()
  async migrate(
    countryCode: string,
    limit = FIND_LIMIT,
    _findFilter: FindFilter = {},
    requestOptions: RequestOptions = {},
  ): Promise<MigrateResult> {
    if (!this.encryptionEnabled) {
      throw new StorageConfigValidationError('Migration not supported when encryption is off');
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
        migrated: records.length,
        totalLeft: meta.total - records.length,
      },
    };

    if (errors) {
      result.meta.errors = errors;
    }

    return result;
  }

  @validate(CountryCodeIO, RecordKeyIO, AttachmentDataIO, optional(t.boolean), optional(RequestOptionsIO))
  @normalizeErrors()
  async addAttachment(
    countryCode: string,
    recordKey: string,
    { file: filePathOrData, mimeType, fileName: userFileName }: AttachmentData,
    upsert = false,
    requestOptions: RequestOptions = {},
  ): Promise<AddAttachmentResult> {
    const file = typeof filePathOrData === 'string' ? createReadStream(filePathOrData) : filePathOrData;

    let fileName: string | undefined;
    if (file instanceof ReadStream && typeof file.path === 'string') {
      fileName = basename(file.path);
    }

    if (typeof userFileName === 'string') {
      fileName = userFileName;
    }

    const data = {
      file,
      fileName,
      mimeType,
    };

    const key = this.createKeyHash(this.normalizeKey(recordKey));

    const attachment = upsert
      ? await this.apiClient.upsertAttachment(countryCode, key, data, requestOptions)
      : await this.apiClient.addAttachment(countryCode, key, data, requestOptions);

    return { attachmentMeta: fromApiRecordAttachment(attachment) };
  }

  @validate(CountryCodeIO, RecordKeyIO, t.string, optional(RequestOptionsIO))
  @normalizeErrors()
  async deleteAttachment(
    countryCode: string,
    recordKey: string,
    fileId: string,
    requestOptions: RequestOptions = {},
  ): Promise<DeleteResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    await this.apiClient.deleteAttachment(countryCode, key, fileId, requestOptions);
    return { success: true };
  }

  @validate(CountryCodeIO, RecordKeyIO, t.string, optional(RequestOptionsIO))
  @normalizeErrors()
  async getAttachmentFile(
    countryCode: string,
    recordKey: string,
    fileId: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetAttachmentFileResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const attachmentData = await this.apiClient.getAttachmentFile(countryCode, key, fileId, requestOptions);
    return { attachmentData };
  }

  @validate(CountryCodeIO, RecordKeyIO, t.string, AttachmentWritableMetaIO, optional(RequestOptionsIO))
  @normalizeErrors()
  async updateAttachmentMeta(
    countryCode: string,
    recordKey: string,
    fileId: string,
    fileMeta: AttachmentWritableMeta,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateAttachmentMetaResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const attachment = await this.apiClient.updateAttachmentMeta(countryCode, key, fileId, fileMeta, requestOptions);
    return { attachmentMeta: fromApiRecordAttachment(attachment) };
  }

  @validate(CountryCodeIO, RecordKeyIO, t.string, optional(RequestOptionsIO))
  @normalizeErrors()
  async getAttachmentMeta(
    countryCode: string,
    recordKey: string,
    fileId: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetAttachmentMetaResult> {
    const key = this.createKeyHash(this.normalizeKey(recordKey));
    const attachment = await this.apiClient.getAttachmentMeta(countryCode, key, fileId, requestOptions);
    return { attachmentMeta: fromApiRecordAttachment(attachment) };
  }

  async validate(): Promise<void> {
    await this.crypto.validate();
  }

  private normalizeKey(key: string | number): string {
    return this.normalizeKeys ? String(key).toLowerCase() : String(key);
  }

  private getKeysToHash(): Array<KeyToHash | SearchKey> {
    let keysToHash: Array<KeyToHash | SearchKey> = KEYS_TO_HASH;
    if (this.hashSearchKeys) {
      keysToHash = keysToHash.concat(SEARCH_KEYS);
    }
    return keysToHash;
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

    if (filterKeyValue !== null) {
      return this.createKeyHash(this.normalizeKey(filterKeyValue));
    }

    return null;
  }

  private hashFilterKeys(filter: ApiFindFilter, keys: Array<KeyToHash | SearchKey>): FindFilter {
    const hashedFilter = { ...filter };
    keys.forEach((key) => {
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

    const keysToHash = this.getKeysToHash();
    keysToHash.forEach((field) => {
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
    if (isInvalid(bodyObj)) {
      throw toStorageServerError('Invalid record body: ')(bodyObj);
    }
    const { payload, meta } = bodyObj.right;

    const keysToHash = [...KEYS_TO_HASH, ...SEARCH_KEYS];
    keysToHash.forEach((field) => {
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

  private getAuthClient(options: StorageOptions) {
    const apiKey = options.apiKey || process.env.INC_API_KEY;
    let clientId = process.env.INC_CLIENT_ID;
    let clientSecret = process.env.INC_CLIENT_SECRET;
    let authEndpoints;
    if (options.oauth && 'token' in options.oauth) {
      return getStaticTokenAuthClient(options.oauth.token);
    }
    if (options.oauth) {
      clientId = options.oauth.clientId || clientId;
      clientSecret = options.oauth.clientSecret || clientSecret;
      authEndpoints = options.oauth.authEndpoints;
    }
    if (clientId || clientSecret) {
      if (!clientId) {
        throw new StorageConfigValidationError('Please pass clientId in options or set INC_CLIENT_ID env var');
      }

      if (!clientSecret) {
        throw new StorageConfigValidationError('Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
      }

      return new OAuthClient(clientId, clientSecret, authEndpoints);
    }
    if (!apiKey) {
      throw new StorageConfigValidationError('Please pass apiKey in options or set INC_API_KEY env var');
    }
    return getStaticTokenAuthClient(apiKey);
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
  KeyToHash,
  KEYS_TO_HASH,
  createStorage,
  FIND_LIMIT,
};
