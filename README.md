


InCountry Storage SDK
============

Important notes
---------------
We've changed the encryption algorithm since version `0.5.0` so it is not compatible with earlier versions.

Installation
-----
SDK is available via NPM:
```
npm install incountry --save
```

Usage
-----
To access your data in InCountry using NodeJS SDK, you need to create an instance of `Storage` class.
```
const Storage = require('incountry/storage');
const storage = new Storage({
 apiKey: 'string',               // Required to be passed in, or as environment variable INC_API_KEY
 environmentId: 'string',        // Required to be passed in, or as environment variable INC_ENVIRONMENT_ID
 endpoint: 'string',             // Optional. Defines API URL
 encrypt: bool',                 // Optional. If false, encryption is not used
},
 secretKeyAccessor,              // Instance of SecretKeyAccessor class. Used to fetch encryption secret
 logger                          // Allows for logging at different log levels in a consistent manner
);
```
`apiKey` and `environmentId` can be fetched from your dashboard on `Incountry` site.

`endpoint` defines API URL and is used to override default one.

You can turn off encryption (not recommended). Set `encrypt` property to `false` if you want to do this.

#### Encryption key

`secretKeyAccessor` is used to pass a secret used for encryption.

Note: even though SDK uses PBKDF2 to generate a cryptographically strong encryption key, you must make sure you provide a secret/password which follows modern security best practices and standards.

`SecretKeyAccessor` class constructor allows you to pass a function that should return either a string representing your secret or a dict (we call it `secretsData` object):

```
{
  secrets: [{
       secret: <string>,
       version: <int>
  }, ....],
  currentVersion: <int>,
}
```

`secretsData` allows you to specify multiple keys which SDK will use for decryption based on the version of the secret used for encryption. Meanwhile SDK will encrypt only using secret that matches `currentVersion` provided in `secretsData` object.

This enables the flexibility required to support Key Rotation policies when secrets/keys need to be changed with time. SDK will encrypt data using newer secret while maintaining the ability to decrypt records encrypted with old secrets. SDK also provides a method for data migration which allows to re-encrypt data with the newest secret. For details please see `migrate` method.

Here are some examples how you can use `SecretKeyAccessor`.
```
const SecretKeyAccessor = require('incountry/secret-key-accessor');

// Synchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(() => {
	return 'longAndStrongPassword'
})

// Asynchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(async () => {
	const secretsData = await getSecretsDataFromSomewhere();
	return secretsData;
})

// Using promises
const secretKeyAccessor = new SecretKeyAccessor(() => new Promise((resolve) => {
	getPasswordFromSomewhere().then(resolve);
}))
```
#### Logging
By default SDK outputs logs into `console` in JSON format. You can override this behavior passing logger object. Logger object must look like the following:
```
const customLogger = {
	write: (logLevel, message) => {}
}
```

### Writing data to Storage

Use `writeAsync` method in order to create/replace (by `key`) a record.
```
const writeResponse = await storage.writeAsync({
	country: 'string',      // Required country code of where to store the data
	key: 'string',          // Required record key
	body: 'string',         // Optional payload
	profile_key: 'string',  // Optional
	range_key: integer,     // Optional
	key2: 'string',         // Optional
	key3: 'string'          // Optional
 });

// Use writeReponse.status for status code.
```
#### Encryption
InCountry uses client-side encryption for your data. Note that only body is encrypted. Some of other fields are hashed.
Here is how data is transformed and stored in InCountry database:
```
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

```
batchResponse = await storage.batchWrite(
	country,     // Required country code of where to store the data
	records      // Required list of records
)

// `batchWrite` returns axios http response
```

### Reading stored data

Stored record can be read by `key` using `readAsync` method. It accepts an object with two fields: `country` and `key`
```
const readResponse = await storage.readAsync({
	country: 'string',      // Required country code
	key: 'string'           // Required record key
});

// Use readResponse.status for status code, and readResponse.data for payload received.
```
Note that `readAsync` returns a `Promise` which is always fulfilled. Use `status` property in order check if operation was successful or not.

### Find records

It is possible to search by random keys using `find` method.
```
const records = await storage.find(country, filter, options)
```
Parameters:
`country` - country code,
`filter` - a filter object (see below),
`options` - an object containing search options.

Here is the example of how `find` method can be used:
```
const records = await storage.find('us', {
	key2: 'kitty',
	key3: ['mew', 'purr'],
}, {
	limit: 10,
	offset: 10
}
```
This call returns all records with `key2` equals `kitty` AND `key3` equals `mew` OR `purr`. The `options` parameter defines the number of records to return and the starting index. It can be used to implement pagination. Note: SDK returns 100 records at most.

The return object looks like the following:
```
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
```
{
	key2: 'kitty'
}
```
One of the values:
```
{
	key3: ['mew', 'purr']
}
```
`range_key` is a numeric field so you can use range filter requests, for example:
```
{
	range_key: { $lt: 1000 } // search for records with range_key <1000
}
```
Available request options for `range_key`: `$lt`, `$lte`, `$gt`, `$gte`.
You can search by any keys: `key`, `key2`, `key3`, `profile_key`, `range_key`.

### Find one record matching filter

If you need to find the first record matching filter, you can use the `findOne` method.
```
const record = await storage.findOne(country, filter)
```
If record not found, it will return `null`.

### Batch read

**Warning**. This method is deprecated. It is recommended to use `find` instead.

It is possible to get a number of records by `key` at once.
```
// Currently only GET batches are supported
const batchResponse = await storage.batchAsync({
 "GET": [ // Array of strings mapping to keys ]})

// Use batchResponse.status for status code, and batchResponse.data for payload received.
```

### Delete records
Use `deleteAsync` method in order to delete a record from InCountry storage. It is only possible using `key` field.
```
const deleteResponse = await storage.deleteAsync({
	country: 'string',      // Required country code
	key: 'string'           // Required record key
});

// Use deleteResponse.status for status code.
```
### Logging
You can specify a custom logger at any time as following:
```
const logger = {
 write: (level, message) => { console.log(`[${level}] ${message}`) }
}

storage.setLogger(logger);
```
Logger must be an object implementing method `write`, which has following signature:
```
write(level, message)
```
* `level` (string) - message level: DEBUG, INFO, etc.
* `message` (string) - log message

Testing Locally
-----

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
