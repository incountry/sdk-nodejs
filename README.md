# InCountry Storage SDK
[![Build Status](https://travis-ci.com/incountry/sdk-nodejs.svg?branch=master)](https://travis-ci.com/incountry/sdk-nodejs)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=alert_status)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=coverage)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)
[![vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=incountry_sdk-nodejs&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=incountry_sdk-nodejs)


Installation
-----

SDK is available via NPM:

```
npm install incountry --save
```

Countries List
----
For a full list of supported countries and their codes please [follow this link](countries.md).


Usage
-----

To access your data in InCountry using NodeJS SDK, you need to create an instance of `Storage` class using async factory method `createStorage`.

```typescript
type StorageOptions = {
  apiKey?: string;         // Required when using API key authorization, or as environment variable INC_API_KEY
  environmentId?: string;  // Required to be passed in, or as environment variable INC_ENVIRONMENT_ID

  oauth?: {
    clientId?: string;     // Required when using oAuth authorization, can be also set via environment variable INC_CLIENT_ID
    clientSecret?: string; // Required when using oAuth authorization, can be also set via environment variable INC_CLIENT_SECRET
    authEndpoints?: {      // Custom endpoints regional map to use for fetching oAuth tokens
      default: string;
      [key: string]: string;
    };
  };

  endpoint?: string;       // Defines API URL
  encrypt?: boolean;       // If false, encryption is not used. Defaults to true.

  logger?: Logger;
  getSecrets?: Function;   // Used to fetch encryption secret
  normalizeKeys?: boolean;
  countriesCache?: CountriesCache;

  /**
   * Defines API base hostname part to use.
   * If set, all requests will be sent to https://${country}${endpointMask} host instead of the default
   * one (https://${country}-mt-01.api.incountry.io)
   */
  endpointMask?: string;

  /**
   * If your PoPAPI configuration relies on a custom PoPAPI server (rather than the default one)
   * use `countriesEndpoint` option to specify the endpoint responsible for fetching supported countries list.
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

const { createStorage } = require('incountry');
const storage = await createStorage({
  apiKey: 'API_KEY',
  environmentId: 'ENVIRONMENT_ID',
  oauth: {
    clientId: '',
    clientSecret: '',
    authEndpoints: {
      default: 'https://auth',
    },
  },
  endpoint: 'INC_URL',
  encrypt: true,
  getSecrets: () => '',
  endpointMask: '',
  countriesEndpoint: '',
  httpOptions: {
    timeout: 5000,
  },
});
```

---
**WARNING**

API Key authorization is being deprecated. We keep backwards compatibility for `apiKey` param but you no longer can get API keys (neither old nor new) from your dashboard.

---

`oauth.clientId`, `oauth.clientSecret` and `environmentId` can be fetched from your dashboard on InCountry site.


Otherwise you can create an instance of `Storage` class and run all async checks by yourself (or not run at your own risk!)

```typescript
const { Storage } = require('incountry');
const storage = new Storage({
  apiKey: 'API_KEY',
  environmentId: 'ENVIRONMENT_ID',
  endpoint: 'INC_URL',
  encrypt: true,
  getSecrets: () => '',
});

await storage.validate();
```

`validate` method fetches secret data using `GetSecretsCallback` and validates it. If custom encryption configs were provided they would also be checked with all matching secrets.


#### oAuth Authentication

SDK also supports oAuth authentication credentials instead of plain API key authorization. oAuth authentication flow is mutually exclusive with API key authentication - you will need to provide either API key or oAuth credentials.

Below is the example how to create storage instance with oAuth credentials (and also provide custom oAuth endpoint):
```typescript
const { Storage } = require('incountry');
const storage = new Storage({
  environmentId: 'ENVIRONMENT_ID',
  endpoint: 'INC_URL',
  encrypt: true,
  getSecrets: () => '',
  oauth: {
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
    authEndpoints: {
      "default": "https://auth-server-default.com",
      "emea": "https://auth-server-emea.com",
      "apac": "https://auth-server-apac.com",
      "amer": "https://auth-server-amer.com",
    },
  },
});
```


#### Encryption key/secret

`GetSecretsCallback` is used to pass a key or secret used for encryption.

Note: even though SDK uses PBKDF2 to generate a cryptographically strong encryption key, you must make sure you provide a secret/password which follows modern security best practices and standards.

`GetSecretsCallback` is a function that should return either a string representing your secret or an object (we call it `SecretsData`) or a `Promise` which resolves to that string or object:

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
      secret: 'bbbbbbbbbbbb...bbb', // Should be a 32-characters 'utf8' encoded string
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

`GetSecretsCallback` allows you to specify multiple keys/secrets which SDK will use for decryption based on the version of the key or secret used for encryption. Meanwhile SDK will encrypt only using key/secret that matches `currentVersion` provided in `SecretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets/keys need to be changed with time. SDK will encrypt data using current secret/key while maintaining the ability to decrypt records encrypted with old keys/secrets. SDK also provides a method for data migration which allows to re-encrypt data with the newest key/secret. For details please see `migrate` method.

SDK allows you to use custom encryption keys, instead of secrets. Please note that user-defined encryption key should be a 32-characters 'utf8' encoded string as it's required by AES-256 cryptographic algorithm.

Here are some examples of `GetSecretsCallback`.

```typescript
type GetSecretsCallback = () => string | SecretsData | Promise<string> | Promise<SecretsData>;

// Synchronous
const getSecretsSync = () => 'longAndStrongPassword';

// Asynchronous
const getSecretsAsync = async () => {
  const secretsData = await getSecretsDataFromSomewhere();
  return secretsData;
};

// Using promises syntax
const getSecretsPromise = () =>
  new Promise(resolve => {
    getPasswordFromSomewhere(secretsData => {
      resolve(secretsData);
    });
  });
```

#### Logging

By default SDK outputs logs into `console` in JSON format. You can override this behavior passing logger object as a Storage constructor parameter. Logger object must look like the following:

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

### Writing data to Storage

Use `write` method in order to create/replace (by `recordKey`) a record.

#### List of available record fields
v3.0.0 release introduced a series of new fields available for storage. Below is an exhaustive list of fields available for storage in InCountry along with their types and  storage methods - each field is either encrypted, hashed or stored as is:


##### String fields, hashed:
```typescript
recordKey
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
profileKey
serviceKey1
serviceKey2
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

```typescript
type StorageRecordData = {
  recordKey: string;
  profileKey?: string | null;
  key1?: string | null;
  key2?: string | null;
  key3?: string | null;
  key4?: string | null;
  key5?: string | null;
  key6?: string | null;
  key7?: string | null;
  key8?: string | null;
  key9?: string | null;
  key10?: string | null;
  serviceKey1?: string | null;
  serviceKey2?: string | null;
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

Below is the example of how you may use `write` method:

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

Use `batchWrite` method to create/replace multiple records at once

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

Stored record can be read by `recordKey` using `read` method. It accepts an object with two fields: `country` and `recordKey`.
It returns a `Promise` which resolves to `{ record }` or is rejected if there are no records for the given `recordKey`.

#### Date fields

Use `createdAt` and `updatedAt` fields to access date-related information about records. `createdAt` indicates date when the record was initially created in the target country. `updatedAt` shows the date of the latest write operation for the given `recordKey`.

```typescript
type StorageRecord = {
  recordKey: string;
  body: string | null;
  profileKey: string | null;
  precommitBody: string | null;
  key1: string | null;
  key2: string | null;
  key3: string | null;
  key4: string | null;
  key5: string | null;
  key6: string | null;
  key7: string | null;
  key8: string | null;
  key9: string | null;
  key10: string | null;
  serviceKey1: string | null;
  serviceKey2: string | null;
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

It is possible to search by random keys using `find` method.

You can specify filter object for every record key combining different queries:
- single value
```typescript
{ key1: 'abc', rangeKey1: 1 }
```

- multiple values as an array
```typescript
{ key2: ['def', 'jkl'], rangeKey1: [1, 2] }
```

- a logical NOT operator for [String fields](#string-fields-hashed) and `version`
```typescript
{ key3: { $not: 'abc' } }
{ key3: { $not: ['abc', 'def'] } }
{ version: { $not: 1 }}
```

- comparison operators for [Int fields](#int-fields-plain)
```typescript
{ rangeKey1: { $gte: 5, $lte: 100 } }
```

The `options` parameter defines the `limit` - number of records to return and the `offset`- starting index.
It can be used to implement pagination. Note: SDK returns 100 records at most.


```typescript
type FilterStringValue = string | string[];
type FilterStringQuery = FilterStringValue | { $not?: FilterStringValue };

type FilterNumberValue = number | number[];
type FilterNumberQuery =
  FilterNumberValue |
  {
    $not?: FilterNumberValue;
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
  };

type FindFilter = Record<string, FilterStringQuery | FilterNumberQuery>;

type FindOptions = {
  limit?: number;
  offset?: number;
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

Example of usage:
```typescript
const filter = {
  key1: 'abc',
  key2: ['def', 'jkl'],
  profileKey: 'test2',
  rangeKey1: { $gte: 5, $lte: 100 },
  rangeKey2: { $not: [0, 1] },
}

const options = {
  limit: 100,
  offset: 0,
};

const findResult = await storage.find(countryCode, filter, options);
```

And the return object `findResult` looks like the following:

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

#### Error handling

There could be a situation when `find` method will receive records that could not be decrypted.
For example, if one changed the encryption key while the found data is encrypted with the older version of that key.
In such cases find() method return data will be as follows:

```typescript
{
  records: [/* successfully decrypted records */],
  errors: [/* errors */],
  meta: {/* ... */}
}: FindResult
```

### Find one record matching filter

If you need to find the first record matching filter, you can use the `findOne` method.
If record not found, it will return `null`.

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

Use `delete` method in order to delete a record from InCountry storage. It is only possible using `recordKey` field.
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

## Data Migration and Key Rotation support

Using `GetSecretCallback` that provides `secretsData` object enables key rotation and data migration support.

SDK introduces `migrate` method which allows you to re-encrypt data encrypted with old versions of the secret.
It returns an object which contains some information about the migration - the amount of records migrated (`migrated`) and the amount of records left to migrate (`total_left`) (which basically means the amount of records with version different from `currentVersion` provided by `GetSecretsCallback`).

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


Error Handling
-----

InCountry Node SDK throws following Exceptions:

- **StorageClientError** - used for various input validation errors. Can be thrown by all public methods.

- **StorageServerError** - thrown if SDK failed to communicate with InCountry servers or if server response validation failed.

- **StorageCryptoError** - thrown during encryption/decryption procedures (both default and custom). This may be a sign of malformed/corrupt data or a wrong encryption key provided to the SDK.

- **StorageError** - general exception. Inherited by all other exceptions

We suggest gracefully handling all the possible exceptions:

```typescript
try {
  // use InCountry Storage instance here
} catch(e) {
  if (e instanceof StorageClientError) {
    // some input validation error
  } else if (e instanceof StorageServerError) {
    // some server error
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
  apiKey: 'API_KEY',
  environmentId: 'ENVIRONMENT_ID',
  getSecrets: getSecretsCallback,
}};

const storage = await createStorage(options, [config]);

await storage.write('us', { recordKey: '<key>', body: '<body>' });
```

## Testing Locally

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
