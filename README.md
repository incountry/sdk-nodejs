# InCountry Storage SDK
[![Build Status](https://travis-ci.com/incountry/sdk-nodejs.svg?branch=master)](https://travis-ci.com/incountry/sdk-nodejs)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=alert_status)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=coverage)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)
[![vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)


## Installation
The SDK is available via NPM:

```
npm install incountry --save
```

## Countries List
To get the full list of supported countries and their codes, please [follow this link](countries.md).


## Quickstart guide
To access your data in InCountry Platform by using NodeJS SDK, you need to create an instance of the Storage class using the createStorage async factory method. You can retrieve the `oauth.clientId`, `oauth.clientSecret` and `environmentId` variables from your dashboard on InCountry Portal.

```typescript
const { createStorage } = require('incountry');
const storage = await createStorage({
  environmentId: '<environment_id>',
  oauth: {
    clientId: '<client_id>',
    clientSecret: '<client_secret>',
  },
  getSecrets: () => '<encryption_secret>',
});
```

## Storage Configuration

Below you can find a full list of possible configuration options for creating a Storage instance.

```typescript
type StorageOptions = {
  apiKey?: string;          // Required when using API key authorization, or as the INC_API_KEY environment variable
  environmentId?: string;   // Required to be passed in, or as the INC_ENVIRONMENT_ID environment variable

  oauth?: {
    clientId?: string;      // Required when using oAuth authorization, can be also set through the INC_CLIENT_ID environment variable
    clientSecret?: string;  // Required when using oAuth authorization, can be also set through INC_CLIENT_SECRET environment variable
    authEndpoints?: {       // Custom endpoints regional map to use for fetching oAuth tokens
      default: string;
      [key: string]: string;
    };
    token?: string;         // Used when OAuth token is already acquired prior to Storage initialization. Mutually exclusive with clientId, clientSecret, authEndpoints
  };

  endpoint?: string;        // Defines API URL
  encrypt?: boolean;        // If false, encryption is not used. Defaults to true.

  logger?: Logger;
  getSecrets?: Function;    // Used to fetch an encryption secret
  normalizeKeys?: boolean;
  countriesCache?: CountriesCache;
  hashSearchKeys?: boolean; // Set to false to enable partial match search among record's text fields `key1, key2, ..., key20`. Defaults to true.

  /**
   * Defines API base hostname part to use.
   * If set, all requests will be sent to https://${country}${endpointMask} host instead of the default
   * one (https://${country}-mt-01.api.incountry.io)
   */
  endpointMask?: string;

  /**
   * If your PoPAPI configuration relies on a custom PoPAPI server (rather than the default one)
   * use the `countriesEndpoint` option to specify the endpoint responsible for fetching the list of supported countries.
   */
  countriesEndpoint?: string;

  httpOptions?: {
    timeout?: NonNegativeInt; // Timeout in milliseconds.
  };
};

async function createStorage(
  options: StorageOptions,
  customEncryptionConfigs?: CustomEncryptionConfig[]
): Promise<Storage> {
  /* ... */
}
```

---
**WARNING**

API Key authorization is being deprecated. The backward compatibility is preserved for the `apiKey` parameter but you no longer can access API keys (neither old nor new) from your dashboard.

Below you can find API Key authorization usage example:

```typescript
const { createStorage } = require('incountry');
const storage = await createStorage({
  apiKey: '<api_key>',
  environmentId: '<environment_id>',
  getSecrets: () => '<encryption_secret>',
});
```

---

#### oAuth options configuration

The SDK allows to precisely configure oAuth authorization endpoints (if needed). Use this option only if your plan configuration requires so.

Below you can find the example of how to create a storage instance with custom oAuth endpoints:
```typescript
const { Storage } = require('incountry');
const storage = new Storage({
  environmentId: '<environment_id>',
  getSecrets: () => '<encryption_secret>',
  oauth: {
    clientId: '<client_id>',
    clientSecret: '<client_secret>',
    authEndpoints: {
      "default": "<default_auth_endpoint>",
      "emea": "<auth_endpoint_for_emea_region>",
      "apac": "<auth_endpoint_for_apac_region>",
      "amer": "<auth_endpoint_for_amer_region>",
    },
  },
});
```


The SDK also allows to use previously acquired oAuth tokens if needed. In this mode SDK is not responsible for oAuth token renewal and it should be done by SDK user himself.

Below you can find the example of how to specify OAuth token while creating a Storage instance:
```typescript
const { Storage } = require('incountry');
const storage = new Storage({
  environmentId: '<environment_id>',
  getSecrets: () => '<encryption_secret>',
  oauth: {
    token: '<token>',
  },
});
```


#### Encryption key/secret

The `getSecrets` storage config option allows you to pass function which will be used to fetch an encryption key(s) or secret. This function should return either a string representing your secret or an object (so-called `SecretsData`) or a `Promise` which is resolved to such string or object:

```typescript
type SecretOrKey = {
  secret: string;
  version: NonNegativeInt;
  isKey?: boolean;
  isForCustomEncryption?: boolean;
};

type SecretsData = {
  currentVersion: NonNegativeInt;
  secrets: Array<SecretOrKey>;
};

/// SecretsData example
{
  secrets: [
    {
      secret: 'aaa',
      version: 0
    },
    {
      secret: 'base64...IHN0cmluZw==', // Should be a base64-encoded key (32 byte key)
      version: 1,
      isKey: true
    },
    {
      secret: 'ccc',
      version: 2,
      isForCustomEncryption: true
    }
  ],
  currentVersion: 1
};
```

Note: even though SDK uses PBKDF2 to generate a cryptographically strong encryption key, you must ensure that you provide a secret/password which follows the modern security best practices and standards.

The `SecretsData` object allows you to specify multiple keys/secrets which the SDK will use for decryption based on the version of the key or secret used for encryption. Meanwhile SDK will encrypt data only by using a key (or secret) which matches the `currentVersion` parameter provided in the `SecretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets (or keys) must be changed with time. The SDK will encrypt data by using the current secret (or key) while maintaining the ability to decrypt data records that were encrypted with old secrets (or keys). The SDK also provides a method for data migration which allows you to re-encrypt data with the newest secret (or key). For details please see the `migrate` method.

The SDK allows you to use custom encryption keys, instead of secrets. Please note that a user-defined encryption key should be a base64-encoded 32-bytes-long key as required by AES-256 cryptographic algorithm.

Below you can find several examples of how you can use the `getSecrets` storage config option:

```typescript
// Synchronous
const getSecretsSync = () => 'longAndStrongPassword';
const storage = await createStorage({
  ...,
  getSecrets: getSecretsSync,
});

// Asynchronous
const getSecretsAsync = async () => {
  const secretsData = await getSecretsDataFromSomewhere();
  return secretsData;
};
const storage = await createStorage({
  ...,
  getSecrets: getSecretsAsync,
});

// Using promises syntax
const getSecretsPromise = () =>
  new Promise(resolve => {
    getSecretsDataFromSomewhere(secretsData => {
      resolve(secretsData);
    });
  });
const storage = await createStorage({
  ...,
  getSecrets: getSecretsPromise,
});
```

#### Logging

By default, the SDK outputs logs into `console` in JSON format. You can override this behavior by passing the logger object as a Storage constructor parameter. The logger object must correspond to the following structure:

```typescript
// Custom logger must implement `write` method

const customLogger = {
  write: (logLevel: LogLevel, message: string, meta?: {}): void => {}
};

const storage = await createStorage({
  apiKey: '',
  environmentId: '',
  getSecrets: () => '',
  logger: customLogger
});
```

#### Skipping Storage validation

You can create an instance of the `Storage` class and run all asynchronous checks by yourself (or skip them at your own risk!).

```typescript
const { Storage } = require('incountry');
const storage = new Storage({...});

await storage.validate();
```

The `validate` method fetches the secret using `getSecrets` and validates it. If custom encryption configurations were provided they would also be checked with all the matching secrets.


## Usage

### Writing data to Storage

Use the `write` method to create/replace a record (by `recordKey`).

#### List of available record fields
v3.0.0 release introduced a series of new fields available for data storage. Below you can find the full list of all the fields available for storage in InCountry Platform along with their types and storage methods. Each field is either encrypted, hashed or stored as follows:


##### String fields, hashed:
```typescript
recordKey
parentKey
profileKey
serviceKey1
serviceKey2
serviceKey3
serviceKey4
serviceKey5
```
##### String fields, hashed if Storage options "hashSearchKeys" is set to true (by default it is):
**WARNING** If the `hashSearchKeys` option is set to `false` the following string fields will have length limitation of 256 characters at most.

```typescript
key1
key2
key3
key4
key5
key6
key7
key8
key9
key10
key11
key12
key13
key14
key15
key16
key17
key18
key19
key20
```

##### String fields, encrypted:
```typescript
body
precommitBody
```

##### Int fields, plain:
```typescript
rangeKey1
rangeKey2
rangeKey3
rangeKey4
rangeKey5
rangeKey6
rangeKey7
rangeKey8
rangeKey9
rangeKey10
```

##### Date fields, plain:
```typescript
expiresAt
```

**WARNING** The data with `expiresAt` will be vanished when time comes ))).


```typescript
type StorageRecordData = {
  recordKey: string;
  parentKey?: string | null;
  profileKey?: string | null;
  key1?: string | null;  // If `hashSearchKeys` is set to `false` key1 has length limit 256
  key2?: string | null;  // If `hashSearchKeys` is set to `false` key2 has length limit 256
  key3?: string | null;  // If `hashSearchKeys` is set to `false` key3 has length limit 256
  key4?: string | null;  // If `hashSearchKeys` is set to `false` key4 has length limit 256
  key5?: string | null;  // If `hashSearchKeys` is set to `false` key5 has length limit 256
  key6?: string | null;  // If `hashSearchKeys` is set to `false` key6 has length limit 256
  key7?: string | null;  // If `hashSearchKeys` is set to `false` key7 has length limit 256
  key8?: string | null;  // If `hashSearchKeys` is set to `false` key8 has length limit 256
  key9?: string | null;  // If `hashSearchKeys` is set to `false` key9 has length limit 256
  key10?: string | null; // If `hashSearchKeys` is set to `false` key10 has length limit 256
  key11?: string | null; // If `hashSearchKeys` is set to `false` key11 has length limit 256
  key12?: string | null; // If `hashSearchKeys` is set to `false` key12 has length limit 256
  key13?: string | null; // If `hashSearchKeys` is set to `false` key13 has length limit 256
  key14?: string | null; // If `hashSearchKeys` is set to `false` key14 has length limit 256
  key15?: string | null; // If `hashSearchKeys` is set to `false` key15 has length limit 256
  key16?: string | null; // If `hashSearchKeys` is set to `false` key16 has length limit 256
  key17?: string | null; // If `hashSearchKeys` is set to `false` key17 has length limit 256
  key18?: string | null; // If `hashSearchKeys` is set to `false` key18 has length limit 256
  key19?: string | null; // If `hashSearchKeys` is set to `false` key19 has length limit 256
  key20?: string | null; // If `hashSearchKeys` is set to `false` key20 has length limit 256
  serviceKey1?: string | null;
  serviceKey2?: string | null;
  serviceKey2?: string | null;
  serviceKey4?: string | null;
  serviceKey5?: string | null;
  body?: string | null;
  precommitBody?: string | null;
  rangeKey1?: t.Int | null;
  rangeKey2?: t.Int | null;
  rangeKey3?: t.Int | null;
  rangeKey4?: t.Int | null;
  rangeKey5?: t.Int | null;
  rangeKey6?: t.Int | null;
  rangeKey7?: t.Int | null;
  rangeKey8?: t.Int | null;
  rangeKey9?: t.Int | null;
  rangeKey10?: t.Int | null;
  expiresAt?: Date | null;
};

type WriteResult = {
  record: StorageRecordData;
};

async write(
  countryCode: string,
  recordData: StorageRecordData,
  requestOptions: RequestOptions = {},
): Promise<WriteResult> {
  /* ... */
}
```

Below you can find the example of how to use the `write` method.

```typescript
const recordData = {
  recordKey: '<key>',
  body: '<body>',
  profileKey: '<profile_key>',
  rangeKey1: 0,
  key2: '<key2>',
  key3: '<key3>'
}

const writeResult = await storage.write(countryCode, recordData);
```

#### Batches

You can use the `batchWrite` method to create/replace multiple records at once.

```typescript
type BatchWriteResult = {
  records: Array<StorageRecordData>;
};

async batchWrite(
  countryCode: string,
  records: Array<StorageRecordData>,
  requestOptions: RequestOptions = {},
): Promise<BatchWriteResult> {
  /* ... */
}
```

Example of usage:
```typescript
batchResult = await storage.batchWrite(countryCode, recordDataArr);
```

### Reading stored data

You can read the stored data records by its `recordKey` by using the `read` method. It accepts an object with the two fields - `country` and `recordKey`.
It returns a `Promise` which is resolved to `{ record }` or is rejected if there are no records for the passed `recordKey`.

#### Date fields

You can use the `createdAt` and `updatedAt` fields to access date-related information about records. The `createdAt` field stores the date when the record was initially created in the target country. The `updatedAt` field stores the date of the latest write operation for the given `recordKey`.

```typescript
type StorageRecord = {
  recordKey: string;
  body: string | null;
  parentKey: string | null;
  profileKey: string | null;
  precommitBody: string | null;
  key1?: string | null;  // If `hashSearchKeys` is set to `false` key1 has length limit 256
  key2?: string | null;  // If `hashSearchKeys` is set to `false` key2 has length limit 256
  key3?: string | null;  // If `hashSearchKeys` is set to `false` key3 has length limit 256
  key4?: string | null;  // If `hashSearchKeys` is set to `false` key4 has length limit 256
  key5?: string | null;  // If `hashSearchKeys` is set to `false` key5 has length limit 256
  key6?: string | null;  // If `hashSearchKeys` is set to `false` key6 has length limit 256
  key7?: string | null;  // If `hashSearchKeys` is set to `false` key7 has length limit 256
  key8?: string | null;  // If `hashSearchKeys` is set to `false` key8 has length limit 256
  key9?: string | null;  // If `hashSearchKeys` is set to `false` key9 has length limit 256
  key10?: string | null; // If `hashSearchKeys` is set to `false` key10 has length limit 256
  key11?: string | null; // If `hashSearchKeys` is set to `false` key11 has length limit 256
  key12?: string | null; // If `hashSearchKeys` is set to `false` key12 has length limit 256
  key13?: string | null; // If `hashSearchKeys` is set to `false` key13 has length limit 256
  key14?: string | null; // If `hashSearchKeys` is set to `false` key14 has length limit 256
  key15?: string | null; // If `hashSearchKeys` is set to `false` key15 has length limit 256
  key16?: string | null; // If `hashSearchKeys` is set to `false` key16 has length limit 256
  key17?: string | null; // If `hashSearchKeys` is set to `false` key17 has length limit 256
  key18?: string | null; // If `hashSearchKeys` is set to `false` key18 has length limit 256
  key19?: string | null; // If `hashSearchKeys` is set to `false` key19 has length limit 256
  key20?: string | null; // If `hashSearchKeys` is set to `false` key20 has length limit 256
  serviceKey1: string | null;
  serviceKey2: string | null;
  serviceKey3: string | null;
  serviceKey4: string | null;
  serviceKey5: string | null;
  rangeKey1: t.Int | null;
  rangeKey2: t.Int | null;
  rangeKey3: t.Int | null;
  rangeKey4: t.Int | null;
  rangeKey5: t.Int | null;
  rangeKey6: t.Int | null;
  rangeKey7: t.Int | null;
  rangeKey8: t.Int | null;
  rangeKey9: t.Int | null;
  rangeKey10: t.Int | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  attachments: StorageRecordAttachment[];
}

type ReadResult = {
  record: StorageRecord;
};

async read(
  countryCode: string,
  recordKey: string,
  requestOptions: RequestOptions = {},
): Promise<ReadResult> {
  /* ... */
}
```

Example of usage:
```javascript
const readResult = await storage.read(countryCode, recordKey);
```

### Find records

You can look up for data records either by using exact match search operators or partial text match operator in almost any combinations.

```typescript
type FilterDateQuery = Date | Date[] | null | { $not?: Date | Date[] | null; $gt?: Date; $gte?: Date; $lt?: Date; $lte?: Date; };
type FilterStringQuery = string | string[] | null | { $not?: string | string[] | null };
type FilterNumberQuery = number | number[] | null | { $not?: number | number[] | null; $gt?: number; $gte?: number; $lt?: number; $lte?: number; };

type FindFilter = Partial<{
  createdAt: FilterDateQuery;
  updatedAt: FilterDateQuery;
  expiresAt: FilterDateQuery;
  recordKey: FilterStringQuery;
  parentKey: FilterStringQuery;
  key1: FilterStringQuery;
  key2: FilterStringQuery;
  key3: FilterStringQuery;
  key4: FilterStringQuery;
  key5: FilterStringQuery;
  key6: FilterStringQuery;
  key7: FilterStringQuery;
  key8: FilterStringQuery;
  key9: FilterStringQuery;
  key10: FilterStringQuery;
  key11: FilterStringQuery;
  key12: FilterStringQuery;
  key13: FilterStringQuery;
  key14: FilterStringQuery;
  key15: FilterStringQuery;
  key16: FilterStringQuery;
  key17: FilterStringQuery;
  key18: FilterStringQuery;
  key19: FilterStringQuery;
  key20: FilterStringQuery;
  profileKey: FilterStringQuery;
  serviceKey1: FilterStringQuery;
  serviceKey2: FilterStringQuery;
  serviceKey3: FilterStringQuery;
  serviceKey4: FilterStringQuery;
  serviceKey5: FilterStringQuery;
  rangeKey1: FilterNumberQuery;
  rangeKey2: FilterNumberQuery;
  rangeKey3: FilterNumberQuery;
  rangeKey4: FilterNumberQuery;
  rangeKey5: FilterNumberQuery;
  rangeKey6: FilterNumberQuery;
  rangeKey7: FilterNumberQuery;
  rangeKey8: FilterNumberQuery;
  rangeKey9: FilterNumberQuery;
  rangeKey10: FilterNumberQuery;
  version: FilterNumberQuery;
  searchKeys: string;
}>;

```


##### Exact match search

The following exact match search criteria are available:
- single value:
```typescript
// Matches all records where record.key1 = 'abc' AND record.rangeKey1 = 1
{ key1: 'abc', rangeKey1: 1 }
```

- multiple values as an array:
```typescript
// Matches all records where (record.key2 = 'def' OR record.key2 = 'jkl') AND (record.rangeKey1 = 1 OR record.rangeKey1 = 2)
{ key2: ['def', 'jkl'], rangeKey1: [1, 2] }
```

- a logical NOT operator for [String fields](#string-fields-hashed) and `version`:
```typescript
// Matches all records where record.key3 <> 'abc'
{ key3: { $not: 'abc' } }

// Matches all records where record.key3 <> 'abc' AND record.key3 <> 'def'
{ key3: { $not: ['abc', 'def'] } }

// Matches all records where record.version <> 1
{ version: { $not: 1 }}
```

- comparison operators for [Int fields](#int-fields-plain):
```typescript
// Matches all records where record.rangeKey1 >= 5 AND record.rangeKey1 <= 100
{ rangeKey1: { $gte: 5, $lte: 100 } }
```

##### Partial text match search

You can also look up for data records by partial match using the `searchKeys` operator which performs partial match
search (similar to the `LIKE` SQL operator, without special characters) within records text fields `key1, key2, ..., key20`.
```typescript
// Matches all records where record.key1 LIKE 'abc' OR record.key2 LIKE 'abc' OR ... OR record.key20 LIKE 'abc'
{ searchKeys: 'abc' }
```

**Please note:** The `searchKeys` operator cannot be used in combination with any of `key1, key2, ..., key20` keys and works only in combination with the non-hashing Storage mode (hashSearchKeys param for Storage).

```typescript
// Matches all records where (record.key1 LIKE 'abc' OR record.key2 LIKE 'abc' OR ... OR record.key20 LIKE 'abc') AND (record.rangeKey1 = 1 OR record.rangeKey1 = 2)
{ searchKeys: 'abc', rangeKey1: [1, 2] }

// Causes validation error (StorageClientError)
{ searchKeys: 'abc', key1: 'def' }
```

#### Search options

The `options` parameter provides the following choices to manipulate the search results:
- `limit` allows to limit the total number of records returned;
- `offset` allows to specify the starting index used for records pagination;
- `sort` allows to sort the returned records by one or multiple keys;

**WARNING** To use `sort` in find() call for string keys `key1...key20` you need to set  `hashSearchKeys` option to `false`.

##### Fields that records can be sorted by:
```typescript
type SortKey =
  | 'createdAt'
  | 'updatedAt'
  | 'expiresAt'
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
  | 'key11'
  | 'key12'
  | 'key13'
  | 'key14'
  | 'key15'
  | 'key16'
  | 'key17'
  | 'key18'
  | 'key19'
  | 'key20'
  | 'rangeKey1'
  | 'rangeKey2'
  | 'rangeKey3'
  | 'rangeKey4'
  | 'rangeKey5'
  | 'rangeKey6'
  | 'rangeKey7'
  | 'rangeKey8'
  | 'rangeKey9'
  | 'rangeKey10';
```

Note: The SDK returns 100 records at most.


```typescript
type SortItem = Partial<Record<SortKey, 'asc' | 'desc'>>; // each sort item should describe only one key!

type FindOptions = {
  limit?: number;
  offset?: number;
  sort?: NonEmptyArray<SortItem>;
};

type FindResult = {
  meta: {
    total: number;
    count: number;
    limit: number;
    offset: number;
  };
  records: Array<StorageRecord>;
  errors?: Array<{ error: StorageCryptoError; rawData: ApiRecord }>;
};

async find(
  countryCode: string,
  filter: FindFilter = {},
  options: FindOptions = {},
  requestOptions: RequestOptions = {},
): Promise<FindResult> {
  /* ... */
}
```

#### Example of usage
```typescript
const filter = {
  key1: 'abc',
  key2: ['def', 'jkl'],
  key3: { $not: null },
  profileKey: 'test2',
  rangeKey1: { $gte: 5, $lte: 100 },
  rangeKey2: { $not: [0, 1] },
}

const options = {
  limit: 100,
  offset: 0,
  sort: [{ createdAt: 'asc' }, { rangeKey1: 'desc' }],
};

const findResult = await storage.find(countryCode, filter, options);
```

The returned `findResult` object looks like the following:

```typescript
{
  records: [{/* StorageRecord */}],
  errors: [],
  meta: {
    limit: 100,
    offset: 0,
    total: 24
  }
}
```

with `findResult.records` sorted according to the following pseudo-sql:
```sql
SELECT * FROM record WHERE ...  ORDER BY createdAt asc, rangeKey1 desc
```

#### Error handling

You may encounter a situation when the `find` method receives records that cannot be decrypted.
For example, this may happen once the encryption key has been changed while the found data was encrypted with the older version of that key.
In such cases data returned by the find() method will be as follows:

```typescript
{
  records: [/* successfully decrypted records */],
  errors: [/* errors */],
  meta: {/* ... */}
}: FindResult
```

### Find one record matching a filter

If you need to find only one of the records matching a specific filter, you can use the `findOne` method.
If a record is not found, it returns `null`.

```typescript
type FindOneResult = {
  record: StorageRecord | null;
};

async findOne(
  countryCode: string,
  filter: FindFilter = {},
  options: FindOptions = {},
  requestOptions: RequestOptions = {},
): Promise<FindOneResult> {
  /* ... */
}
```

Example of usage:
```typescript
const findOneResult = await storage.findOne(countryCode, filter);
```

### Delete records

You can use the `delete` method to delete a record from InCountry Platform. It is possible by using the `recordKey` field only.
```typescript
type DeleteResult = {
  success: true;
};

async delete(
  countryCode: string,
  recordKey: string,
  requestOptions: RequestOptions = {},
): Promise<DeleteResult> {
  /* ... */
}
```

Example of usage:
```typescript
const deleteResult = await storage.delete(countryCode, recordKey);
```

## Attaching files to a record

---
**NOTE**

Attachments are currently available for InCountry dedicated instances only. Please check your subscription plan for details. This may require specifying your dedicated instance endpoint when configuring NodeJS SDK Storage.

---

InCountry Storage allows you to attach files to the previously created records. Attachments' meta information is available through the `attachments` field of `StorageRecord` object.


```typescript
type StorageRecord = {
  /* ... other fields ...  */
  attachments: StorageRecordAttachment[];
}

type StorageRecordAttachment = {
  fileId: string;
  fileName: string;
  hash: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  downloadLink: string;
}
```


### Adding attachments
The `addAttachment` method allows you to add or replace attachments.
File data can be provided either as `Readable` stream, `Buffer` or `string` with a path to the file in the file system.

```typescript
type AttachmentData = {
  file: Readable | Buffer | string;
  fileName: string;
}

async addAttachment(
  countryCode: string,
  recordKey: string,
  { file, fileName }: AttachmentData,
  upsert = false,
  requestOptions: RequestOptions = {},
): Promise<StorageRecordAttachment> {
  /* ... */
}
```

Example of usage:
```typescript
// using file path
await storage.addAttachment(COUNTRY, recordData.recordKey, { file: '../file' });

// using data Stream
import * as fs from 'fs';

const file = fs.createReadStream('./LICENSE');
await storage.addAttachment(COUNTRY, recordData.recordKey, { file });
```

### Deleting attachments
The `deleteAttachment` method allows you to delete attachment using its `fileId`.

```typescript
deleteAttachment(
  countryCode: string,
  recordKey: string,
  fileId: string,
  requestOptions: RequestOptions = {},
): Promise<unknown> {
  /* ... */
}
```

Example of usage:
```typescript
await storage.deleteAttachment(COUNTRY, recordData.recordKey, attachmentMeta.fileId);
```

### Downloading attachments
The `getAttachmentFile` method allows you to download attachment contents.
It returns object with readable stream and filename.

```typescript
async getAttachmentFile(
  countryCode: string,
  recordKey: string,
  fileId: string,
  requestOptions: RequestOptions = {},
): Promise<GetAttachmentFileResult> {
  /* ... */
}
```

Example of usage:
```typescript
import * as fs from 'fs';

const { attachmentData } = await storage.getAttachmentFile(COUNTRY, recordData.recordKey, attachmentMeta.fileId);

const { file, fileName } = attachmentData;
const writeStream = fs.createWriteStream(`./${fileName}`);
file.pipe(writeStream);
```

### Working with attachment meta info
The `getAttachmentMeta` method allows you to retrieve attachment's metadata using its `fileId`.
```typescript
async getAttachmentMeta(
  countryCode: string,
  recordKey: string,
  fileId: string,
  requestOptions: RequestOptions = {},
): Promise<StorageRecordAttachment> {
  /* ... */
}
```

Example of usage:
```typescript
const meta: StorageRecordAttachment = await storage.getAttachmentMeta(COUNTRY, recordData.recordKey, attachmentMeta.fileId);
```

The `updateAttachmentMeta` method allows you to update attachment's metadata (MIME type and file name).

```typescript
type AttachmentWritableMeta = {
  fileName?: string;
  mimeType?: string;
};

async updateAttachmentMeta(
  countryCode: string,
  recordKey: string,
  fileId: string,
  fileMeta: AttachmentWritableMeta,
  requestOptions: RequestOptions = {},
): Promise<StorageRecordAttachment> {
    /* ... */
}
```

Example of usage:
```typescript
await storage.updateAttachmentMeta(COUNTRY, data.recordKey, attachmentMeta.fileId, { fileName: 'new name!' });
```


## Data Migration and Key Rotation support

Using `getSecrets` storage config options that provides `SecretsData` object enables key rotation and data migration support.

SDK introduces `migrate` method which allows you to re-encrypt data encrypted with old versions of the secret.
It returns an object which contains some information about the migration - the amount of records migrated (`migrated`) and the amount of records left to migrate (`totalLeft`) (which basically means the amount of records with version different from `currentVersion` provided by `SecretsData`).

For a detailed example of a migration script please see [examples/migration.js](examples/migration.js)

```typescript
type MigrateResult = {
  meta: {
    migrated: number;
    totalLeft: number;
  };
};

async migrate(
  countryCode: string,
  limit = FIND_LIMIT,
  findFilter: FindFilter = {},
  requestOptions: RequestOptions = {},
): Promise<MigrateResult> {
  /* ... */
}
```

Example of usage:
```typescript
const migrateResult = await storage.migrate(countryCode);
```


## AWS KMS integration

InCountry NodeJS SDK supports usage of any 32-byte (256-bit) AES key, including ones produced by AWS KMS symmetric master key (CMK).

The suggested use case assumes that AWS user already got his KMS encrypted data key (AES_256) generated. Afterwards the key gets decrypted using AWS Node.js client library (`aws-sdk/clients/kms`) and then provided to InCountry NodeJS SDK's `getSecrets()` function.

For a detailed example of AWS KMS keys usage please see [examples/aws-kms.js](examples/aws-kms.js)


## Error Handling

InCountry NodeJS SDK throws the following Exceptions:

- **StorageConfigValidationError** - used for Storage options validation errors. Can be thrown by any public method.

- **SecretsProviderError** - can be thrown during the call of `getSecrets()` function. Wraps the original error which occurred in `getSecrets()`.

- **SecretsValidationError** - can be thrown if `getSecrets()` function returned secrets in wrong format.

- **InputValidationError** - used for input validation errors. Can be thrown by all public methods except Storage constructor.

- **StorageAuthenticationError** - can be thrown if SDK failed to authenticate in InCountry system with the provided credentials.

- **StorageClientError** - used for various errors related to Storage configuration. All of the errors classes `StorageConfigValidationError`, `SecretsProviderError`, `SecretsValidationError`, `InputValidationError`, `StorageAuthenticationError` are inherited from `StorageClientError`.

- **StorageServerError** - thrown if SDK failed to communicate with InCountry servers or if server response validation failed.

- **StorageNetworkError** - thrown if SDK failed to communicate with InCountry servers due to network issues, such as request timeout, unreachable `endpoint` etc. Inherited from `StorageServerError`.

- **StorageCryptoError** - thrown during encryption/decryption procedures (both default and custom). This may be a sign of malformed/corrupt data or a wrong encryption key provided to the SDK.

- **StorageError** - general exception. Inherited by all other exceptions

We suggest gracefully handling all the possible exceptions:

```typescript
try {
  // use InCountry Storage instance here
} catch(e) {
  if (e instanceof StorageClientError) {
    // some input validation error

    // if you need to handle configuration errors more precisely:
    if (e instanceof StorageConfigValidationError) {
      // something is wrong with Storage options
    } else if (e instanceof SecretsProviderError) {
      // something is wrong with `getSecrets()` function. The original error is available in `e.data`
    } else if (e instanceof SecretsValidationError) {
      // something is wrong with `getSecrets()` function result
    } else if (e instanceof InputValidationError) {
      // something is wrong with input data passed to Storage public method
    } else if (e instanceof StorageAuthenticationError) {
      // something is wrong with the credentials provided in Storage options
    }
  } else if (e instanceof StorageServerError) {
    // some server error

    if (e instanceof StorageNetworkError) {
      // something is wrong with network connection
    } else {
      // server error or server response validation failed
    }
  } else if (e instanceof StorageCryptoError) {
    // some encryption error
  } else {
    // ...
  }
}
```


#### Custom encryption

SDK supports the ability to provide custom encryption/decryption methods if you decide to use your own algorithm instead of the default one.

`createStorage(options, customEncConfigs)` allows you to pass an array of custom encryption configurations with the following schema, which enables custom encryption:

```typescript
{
  encrypt: (text: string, secret: string, secretVersion: string) => Promise<string> | string,
  decrypt: (encryptedText: string, secret: string, secretVersion: string) => Promise<string> | string,
  isCurrent: boolean, // Optional but at most one in array should be isCurrent: true
  version: string
}
```
They should accept raw data to encrypt/decrypt, key data and key version received from SecretKeyAccessor.
The resulted encrypted/decrypted data should be a string.

`version` attribute is used to differ one custom encryption from another and from the default encryption as well.
This way SDK will be able to successfully decrypt any old data if encryption changes with time.

`isCurrent` attribute allows to specify one of the custom encryption configurations to use for encryption.
Only one configuration can be set as `isCurrent: true`.


Here's an example of how you can set up SDK to use custom encryption (using XXTEA encryption algorithm):

```typescript
const xxtea = require('xxtea');
const encrypt = (text, secret) => xxtea.encrypt(text, secret);
const decrypt = (encryptedText, secret) => xxtea.decrypt(encryptedText, secret);

const config = {
  encrypt,
  decrypt,
  isCurrent: true,
  version: 'current',
};

const getSecretsCallback = () => {
  return {
    secrets: [
      {
        secret: 'longAndStrongPassword',
        version: 1,
        isForCustomEncryption: true
      }
    ],
    currentVersion: 1,
  };
}

const options = {
  environmentId: 'ENVIRONMENT_ID',
  oauth: {
    clientId: '<client_id>',
    clientSecret: '<client_secret>',
  },
  getSecrets: getSecretsCallback,
};

const storage = await createStorage(options, [config]);

await storage.write('us', { recordKey: '<key>', body: '<body>' });
```

## Testing Locally

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
