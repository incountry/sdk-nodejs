# InCountry Storage SDK

## Important notes

We've changed the encryption algorithm since version `0.5.0` so it is not compatible with earlier versions.

## Installation

SDK is available via NPM:

```
npm install incountry --save
```

## Usage

To access your data in InCountry using NodeJS SDK, you need to create an instance of `Storage` class.

```javascript
const Storage = require("incountry/storage");
const storage = new Storage(
  {
    apiKey: "", // {string} Required to be passed in, or as environment variable INC_API_KEY
    environmentId: "", // {string} Required to be passed in, or as environment variable INC_ENVIRONMENT_ID
    endpoint: "", // {string} Optional. Defines API URL
    encrypt: true // {boolean} Optional. If false, encryption is not used. If omitted is set to true.
  },
  secretKeyAccessor // {SecretKeyAccessor} Used to fetch encryption secret
);
```

`apiKey` and `environmentId` can be fetched from your dashboard on `Incountry` site.

#### Encryption key/secret

`secretKeyAccessor` is used to pass a key or secret used for encryption.

Note: even though SDK uses PBKDF2 to generate a cryptographically strong encryption key, you must make sure you provide a secret/password which follows modern security best practices and standards.

`SecretKeyAccessor` class constructor allows you to pass a function that should return either a string representing your secret or a dict (we call it `SecretsData` object):

```javascript
{
  secrets: [
    {
      secret: "abc", // {string}
      version: 0, // {number} Should be a positive integer
      isKey: false // {boolean} Should be true only for user-defined encryption key
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

`SecretsData` allows you to specify multiple keys/secrets which SDK will use for decryption based on the version of the key or secret used for encryption. Meanwhile SDK will encrypt only using key/secret that matches `currentVersion` provided in `SecretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets/keys need to be changed with time. SDK will encrypt data using current secret while maintaining the ability to decrypt records encrypted with old keys/secrets. SDK also provides a method for data migration which allows to re-encrypt data with the newest key/secret. For details please see `migrate` method.

Here are some examples how you can use `SecretKeyAccessor`.

```javascript
const SecretKeyAccessor = require("incountry/secret-key-accessor");

// Synchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(() => {
  return "longAndStrongPassword";
});

// Asynchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(async () => {
  const secretsData = await getSecretsDataFromSomewhere();
  return secretsData;
});

// Using promises
const secretKeyAccessor = new SecretKeyAccessor(
  () =>
    new Promise(resolve => {
      getPasswordFromSomewhere(secretsData => {
        resolve(secretsData);
      });
    })
);
```

#### Logging

By default SDK outputs logs into `console` in JSON format. You can override this behavior passing logger object as a Storage constructor parameter. Logger object must look like the following:

```javascript
const customLogger = {
  write: (logLevel, message) => {} // Custom logger must implement `write` with two parameters - logLevel {string}, message {string}
};

const storage = new Storage(
  {
    apiKey: "",
    environmentId: ""
  },
  secretKeyAccessor,
  customLogger
);
```

### Writing data to Storage

Use `writeAsync` method in order to create/replace (by `key`) a record.

```javascript
const writeResponse = await storage.writeAsync({
  country: "string", // Required country code of where to store the data
  key: "string", // Required record key
  body: "string", // Optional payload
  profile_key: "string", // Optional
  range_key: integer, // Optional
  key2: "string", // Optional
  key3: "string" // Optional
});

// Use writeReponse.status for status code.
```

#### Encryption

InCountry uses client-side encryption for your data. Note that only body is encrypted. Some of other fields are hashed.
Here is how data is transformed and stored in InCountry database:

```javascript
{
  key, // hashed
    body, // encrypted
    profile_key, // hashed
    range_key, // plain
    key2, // hashed
    key3; // hashed
}
```

#### Batches

Use `batchWrite` method to create/replace multiple records at once

```javascript
batchResponse = await storage.batchWrite(
  country, // Required country code of where to store the data
  records // Required list of records
);

// `batchWrite` returns axios http response
```

### Reading stored data

Stored record can be read by `key` using `readAsync` method. It accepts an object with two fields: `country` and `key`

```javascript
const readResponse = await storage.readAsync({
  country: "string", // Required country code
  key: "string" // Required record key
});

// Use readResponse.status for status code, and readResponse.data for payload received.
```

Note that `readAsync` returns a `Promise` which is always fulfilled. Use `status` property in order check if operation was successful or not.

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
	data: [/* kitties */],
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

### Find one record matching filter

If you need to find the first record matching filter, you can use the `findOne` method.

```javascript
const record = await storage.findOne(country, filter);
```

If record not found, it will return `null`.

### Delete records

Use `deleteAsync` method in order to delete a record from InCountry storage. It is only possible using `key` field.

```javascript
const deleteResponse = await storage.deleteAsync({
  country: "string", // Required country code
  key: "string" // Required record key
});

// Use deleteResponse.status for status code.
```

## Data Migration and Key Rotation support

Using `secretKeyAccessor` that provides `secretsData` object enables key rotation and data migration support.

SDK introduces `migrate(country: str, limit: int)` method which allows you to re-encrypt data encrypted with old versions of the secret. You should specify `country` you want to conduct migration in and `limit` for precise amount of records to migrate. `migrate` return a dict which contains some information about the migration - the amount of records migrated (`migrated`) and the amount of records left to migrate (`total_left`) (which basically means the amount of records with version different from `currentVersion` provided by `secretKeyAccessor`)

```javascript
{
	"migrated": <int>
	"total_left": <int>
}
```

For a detailed example of a migration script please see `/examples/fullMigration.js`

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
