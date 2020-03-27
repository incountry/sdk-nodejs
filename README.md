# InCountry Storage SDK

## Installation

SDK is available via NPM:

```
npm install incountry --save
```

## Usage

To access your data in InCountry using NodeJS SDK, you need to create an instance of `Storage` class using async constructor `createStorage`.

```javascript
const createStorage = require("incountry/storage");
const storage = await createStorage(
  {
    apiKey: "",        // {string} Required to be passed in, or as environment variable INC_API_KEY
    environmentId: "", // {string} Required to be passed in, or as environment variable INC_ENVIRONMENT_ID
    endpoint: "",      // {string} Optional - Defines API URL
    encrypt: true      // {boolean} Optional - If false, encryption is not used. If omitted is set to true.
  },
  () => "",            // {GetSecretCallback} Used to fetch encryption secret
);
```

`apiKey` and `environmentId` can be fetched from your dashboard on `Incountry` site.

#### Encryption key/secret

`GetSecretCallback` is used to pass a key or secret used for encryption.

Note: even though SDK uses PBKDF2 to generate a cryptographically strong encryption key, you must make sure you provide a secret/password which follows modern security best practices and standards.

`GetSecretCallback` is a function that should return either a string representing your secret or an object (we call it `SecretsData`) or a `Promise` which resolves to that string or object:

```javascript
{
  secrets: [
    {
      secret: "abc", // {string}
      version: 0     // {number} Should be a non negative integer
    },
    {
      secret: "def", // {string}
      version: 1,    // {number} Should be a non negative integer
      isKey: false   // {boolean} Should be true only for user-defined encryption key
    }
  ],
  currentVersion: 1  // {number} Should be a non negative integer
};
```

`GetSecretCallback` allows you to specify multiple keys/secrets which SDK will use for decryption based on the version of the key or secret used for encryption. Meanwhile SDK will encrypt only using key/secret that matches `currentVersion` provided in `SecretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets/keys need to be changed with time. SDK will encrypt data using current secret/key while maintaining the ability to decrypt records encrypted with old keys/secrets. SDK also provides a method for data migration which allows to re-encrypt data with the newest key/secret. For details please see `migrate` method.

SDK allows you to use custom encryption keys, instead of secrets. Please note that user-defined encryption key should be a 32-characters 'utf8' encoded string as it's required by AES-256 cryptographic algorithm.

Here are some examples of `GetSecretCallback`.

```javascript
// GetSecretCallback = () => string | SecretsData | Promise<string> | Promise<SecretsData>

// Synchronous 
const getSecretSync = () => "longAndStrongPassword";

// Asynchronous
const getSecretAsync = async () => {
  const secretsData = await getSecretsDataFromSomewhere();
  return secretsData;
};

// Using promises syntax
const getSecretPromise = () =>
  new Promise(resolve => {
    getPasswordFromSomewhere(secretsData => {
      resolve(secretsData);
    });
  });
```

#### Logging

By default SDK outputs logs into `console` in JSON format. You can override this behavior passing logger object as a Storage constructor parameter. Logger object must look like the following:

```javascript
// Custom logger must implement `write` method
const customLogger = {
  write: (logLevel, message) => {} // {(logLevel:string, message: string) => void}
};

const storage = await createStorage(
  {
    apiKey: "",
    environmentId: ""
  },
  () => "", // {GetSecretCallback}
  customLogger
);
```

### Writing data to Storage

Use `write` method in order to create/replace (by `key`) a record.

```javascript
// Record
const record = {  
  key: "<key>",                 // {string} Record key
  body: "<body>",               // {string} Optional payload
  profile_key: "<profile_key>", // {string} Optional
  range_key: 0,                 // {number} Optional integer
  key2: "<key2>",               // {string} Optional
  key3: "<key3>"                // {string} Optional
}

const writeResult = await storage.write(
  country, // {string} Country code of where to store the data 
  record, // {Record}
);

// WriteResult = { record: Record }
```

#### Encryption

InCountry uses client-side encryption for your data. Note that only body is encrypted. Some of other fields are hashed.
Here is how data is transformed and stored in InCountry database:

```javascript
{
  key,          // hashed
  body,         // encrypted
  profile_key,  // hashed
  range_key,    // plain
  key2,         // hashed
  key3          // hashed
}
```

#### Batches

Use `batchWrite` method to create/replace multiple records at once

```javascript
batchResult = await storage.batchWrite(
  country, // {string} Country code of where to store the data
  records  // {Array<Record>} Array of records
);

// BatchWriteResult = { records: Array<Record> }
```

### Reading stored data

Stored record can be read by `key` using `read` method. It accepts an object with two fields: `country` and `key`.
It returns a `Promise` which resolves to `{ record }`  or  `{ record: null }` if there is no record with this `key`.

```javascript
const readResult = await storage.read(
  country, // {string} Country code
  key      // {string} Record key
);

// ReadResult = { record: Record | null }
```

### Find records

It is possible to search by random keys using `find` method.

You can specify filter object for every record key combining different queries:
- single value
- several values as an array
- a logical NOT operation on the specific field `$not`
- comparison operations `$lt`, `$lte`, `$gt`, `$gte` (only for number fields such as `range_key` and `version`)

The `options` parameter defines the `limit` - number of records to return and the `offset`- starting index. 
It can be used to implement pagination. Note: SDK returns 100 records at most.


```javascript
// FilterStringValue = string | Array<string> | { $not: string | Array<string> }
// FilterNumberValue = 
//   | number 
//   | Array<number> 
//   | { $not: number | Array<number> } 
//   | { $gt?: number, $gte?: number, $lt?: number, $lte?: number }
  

const filter = {
  key: 'abc',                        // {FilterStringValue} Optional
  key2: ['def', 'jkl'],              // {FilterStringValue} Optional
  key3: { $not: 'test' }             // {FilterStringValue} Optional
  profile_key: 'test2',              // {FilterStringValue} Optional
  range_key: { $gte: 5, $lte: 100 }, // {FilterNumberValue} Optional
  version: { $not: [0, 1] },         // {FilterNumberValue} Optional
}

const options = {
  limit: 100,  // {number} Positive Int, Optional, max 100
  offset: 0,   // {number} Non Negative Int, Optional
};

const findResult = await storage.find(
  country, // {string} Country code
  filter,  // {Filter} Optional
  options  // {Option} Optional
);

// FindResult = {
//   records: Array<Record>,
//   errors: {Array<{ error: InCryptoError, rawData: Record  }>}, // Optional - Array of errors and records which caused them
//   meta: {
//     limit: number,
//     offset: number,
//     total: number // Total records matching filter, ignoring limit
//   }
// }
```

Here is the example of how `find` method can be used:

```javascript
const findResult = await storage.find(
  "us",
  {
    key2: "kitty",
    key3: ["mew", "purr"]
  },
  {
    limit: 10,
    offset: 10
  }
);
```

This call returns all records with `key2` equals `kitty` AND `key3` equals `mew` OR `purr`.  

The return object looks like the following:

```javascript
{
  records: [/* kitties */],
  errors: [],
  meta: {
    limit: 10, 
    offset: 10,
    total: 124
  }
}
```

#### Error handling

There could be a situation when `find` method will receive records that could not be decrypted.
For example, if one changed the encryption key while the found data is encrypted with the older version of that key.
In such cases find() method return data will be as follows:

```javascript
// StorageClientError = {
//   message: string // Error message
//   data: any       // Raw record which caused error
// }

{
  records: [/* successfully decrypted records */],
  errors: [/* errors */], // {Array<StorageClientError>}
  meta: {/* ... */}
}
```

### Find one record matching filter

If you need to find the first record matching filter, you can use the `findOne` method.
If record not found, it will return `null`.

```javascript
const findOneResult = await storage.findOne(
  country, // {string} Country code
  filter   // {Filter} Optional
);

// FindOneResult = Record | null
```

### Delete records

Use `delete` method in order to delete a record from InCountry storage. It is only possible using `key` field.

```javascript
const deleteResult = await storage.delete(
  country, // {string} Country code
  key      // {string} Record key
);

// DeleteResult = { success: true }
```

## Data Migration and Key Rotation support

Using `GetSecretCallback` that provides `secretsData` object enables key rotation and data migration support.

SDK introduces `migrate` method which allows you to re-encrypt data encrypted with old versions of the secret. 
It returns an object which contains some information about the migration - the amount of records migrated (`migrated`) and the amount of records left to migrate (`total_left`) (which basically means the amount of records with version different from `currentVersion` provided by `GetSecretCallback`).

For a detailed example of a migration script please see [examples/fullMigration.js](examples/fullMigration.js)

```javascript
const migrateResult = await storage.migrate(
  country, // {string} Country code
  limit    // {number} Positive Int - Amount of records to migrate 
);

// MigrateResult = { 
//   migrated: number,  // Non Negative Int - The amount of records migrated
//   total_left: number // Non Negative Int - The amount of records left to migrate
// }
```



#### Custom encryption

SDK supports the ability to provide custom encryption/decryption methods if you decide to use your own algorithm instead of the default one.

`storage.setCustomEncryption(configs)` allows you to pass an array of custom encryption configurations with the following schema, which enables custom encryption:

```typescript
{
  encrypt: (text: string, secret: string, secretVersion: string) => Promise<string>,
  decrypt: (encryptedText: string, secret: string, secretVersion: string) => Promise<string>,
  isCurrent: boolean, // Optional but at least one in array should be isCurrent: true
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

```javascript
const xxtea = require("xxtea");
const encrypt = async function(text, secret) {
  return xxtea.encrypt(text, secret);
};

const decrypt = async function(encryptedText, secret) {
  return xxtea.decrypt(encryptedText, secret);
};

const storage = await createStorage(
  {
    apiKey: "",
    environmentId: "",
    endpoint: "",
    encrypt: true,
  },
  () => "longAndStrongPassword",
);

storage.setCustomEncryption([{ 
  encrypt,
  decrypt,
  isCurrent: true,
  version: "current",
}]);

await storage.write("US", { key: "<key>", body: "<body>" });
```

## Testing Locally

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
