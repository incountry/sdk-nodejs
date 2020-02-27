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
    apiKey: "", // {string} Required to be passed in, or as environment variable INC_API_KEY
    environmentId: "", // {string} Required to be passed in, or as environment variable INC_ENVIRONMENT_ID
    endpoint: "", // {string} Optional. Defines API URL
    encrypt: true // {boolean} Optional. If false, encryption is not used. If omitted is set to true.
  },
  () => "", // {GetSecretCallback} Used to fetch encryption secret
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
      version: 0 // {number} Should be a positive integer
    },
    {
      secret: "def", // {string}
      version: 1, // {number} Should be a positive integer
      isKey: false // {boolean} Should be true only for user-defined encryption key
    }
  ],
  currentVersion: 1 // {number} Should be a positive integer
};
```

`GetSecretCallback` allows you to specify multiple keys/secrets which SDK will use for decryption based on the version of the key or secret used for encryption. Meanwhile SDK will encrypt only using key/secret that matches `currentVersion` provided in `SecretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets/keys need to be changed with time. SDK will encrypt data using current secret/key while maintaining the ability to decrypt records encrypted with old keys/secrets. SDK also provides a method for data migration which allows to re-encrypt data with the newest key/secret. For details please see `migrate` method.

SDK allows you to use custom encryption keys, instead of secrets. Please note that user-defined encryption key should be a 32-characters 'utf8' encoded string as it's required by AES-256 cryptographic algorithm.

Here are some examples of `GetSecretCallback`.

```javascript
// Synchronous 
const getSecretSync = () => "longAndStrongPassword";

// Asynchronous
const getSecretAsync = async () => {
  const secretsData = await getSecretsDataFromSomewhere();
  return secretsData;
};

// Using promises
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
const customLogger = {
  write: (logLevel, message) => {} // Custom logger must implement `write` with two parameters - logLevel {string}, message {string}
};

const storage = await createStorage(
  {
    apiKey: "",
    environmentId: ""
  },
  () => "",
  customLogger
);
```

### Writing data to Storage

Use `write` method in order to create/replace (by `key`) a record.

```javascript
const writeResponse = await storage.write(
  country, // Required country code of where to store the data 
  {  
    key: "string", // Required record key
    body: "string", // Optional payload
    profile_key: "string", // Optional
    range_key: integer, // Optional
    key2: "string", // Optional
    key3: "string" // Optional
  }
);

// Use writeReponse.status for status code.
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
batchResponse = await storage.batchWrite(
  country, // Required country code of where to store the data
  records // Required array of records
);

// `batchWrite` returns axios http response
```

### Reading stored data

Stored record can be read by `key` using `read` method. It accepts an object with two fields: `country` and `key`

```javascript
const readResponse = await storage.read(
  country, // Required country code
  key // Required record key
);

// Use readResponse.status for status code, and readResponse.data for payload received.
```

Note that `read` returns a `Promise` which is always fulfilled. Use `status` property in order check if operation was successful or not.

### Find records

It is possible to search by random keys using `find` method.

```javascript
const records = await storage.find(country, filter, options);
```

Parameters:
`country` - country code,
`filter` - a filter object (see below),
`options` - an object containing search options.

Here is the example of how `find` method can be used:

```javascript
const records = await storage.find(
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

This call returns all records with `key2` equals `kitty` AND `key3` equals `mew` OR `purr`. The `options` parameter defines the number of records to return and the starting index. It can be used to implement pagination. Note: SDK returns 100 records at most.

The return object looks like the following:

```javascript
{
	records: [/* kitties */],
	errors: [], // optional
	meta: {
		limit: 10,
		offset: 10,
		total: 124 // total records matching filter, ignoring limit
	}
}
```

You can use the following types for filter fields.
Single value:

```javascript
{
  key2: "kitty";
}
```

One of the values:

```javascript
{
  key3: ["mew", "purr"];
}
```

`range_key` is a numeric field so you can use range filter requests, for example:

```javascript
{
  range_key: {
    $lt: 1000;
  } // search for records with range_key <1000
}
```

Available request options for `range_key`: `$lt`, `$lte`, `$gt`, `$gte`.
You can search by any keys: `key`, `key2`, `key3`, `profile_key`, `range_key`.

#### Error handling

There could be a situation when `find` method will receive records that could not be decrypted.
For example, if one changed the encryption key while the found data is encrypted with the older version of that key.
In such cases find() method return data will be as follows:

```javascript
{
	records: [/* successfully decrypted records */],
	errors: [{
		rawData,  // raw record which caused decryption error
		error,    // decryption error description 
	}, ...],
	meta: { ... }
}
```

### Find one record matching filter

If you need to find the first record matching filter, you can use the `findOne` method.

```javascript
const record = await storage.findOne(country, filter);
```

If record not found, it will return `null`.

### Delete records

Use `delete` method in order to delete a record from InCountry storage. It is only possible using `key` field.

```javascript
const deleteResponse = await storage.delete(
  country, // Required country code
  key // Required record key
);

// Use deleteResponse.status for status code.
```

## Data Migration and Key Rotation support

Using `GetSecretCallback` that fetches `secretsData` object enables key rotation and data migration support.

SDK introduces `migrate(country: str, limit: int)` method which allows you to re-encrypt data encrypted with old versions of the secret. You should specify `country` you want to conduct migration in and `limit` for precise amount of records to migrate. `migrate` return an object which contains some information about the migration - the amount of records migrated (`migrated`) and the amount of records left to migrate (`total_left`) (which basically means the amount of records with version different from `currentVersion` provided by `GetSecretCallback`)

```javascript
{
	"migrated": <int>
	"total_left": <int>
}
```

For a detailed example of a migration script please see `/examples/fullMigration.js`

#### Custom encryption

SDK supports the ability to provide custom encryption/decryption methods if you decide to use your own algorithm instead of the default one.

`storage.setCustomEncryption(configs)` allows you to pass an array of custom encryption configurations with the following schema, which enables custom encryption:

```typescript
{
  encrypt: (text: string, secret: string, secretVersion: string) => Promise<string>,
  decrypt: (encryptedText: string, secret: string, secretVersion: string) => Promise<string>,
  isCurrent: boolean, // optional but at least one in array should be isCurrent: true
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

### Logging

You can specify a custom logger at any time as following:

```javascript
const logger = {
  write: (level, message) => {
    console.log(`[${level}] ${message}`);
  }
};

storage.setLogger(logger);
```

Logger must be an object implementing method `write`, which has following signature:

```javascript
write(level, message);
```

- `level` (string) - message level: DEBUG, INFO, etc.
- `message` (string) - log message

## Testing Locally

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
