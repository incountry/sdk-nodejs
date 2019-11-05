
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
1. Create storage instance  

```  
const Storage = require('incountry/storage');
const storage = new Storage({  
 apiKey: 'string',               // Required to be passed in, or as environment variable INC_API_KEY 
 environmentId: 'string',        // Required to be passed in, or as environment variable INC_ENVIRONMENT_ID 
 endpoint: 'string',             // Optional. Defines PoP API URL
 encrypt: bool',                 // Optional. If false, encryption is not used
},  
 secretKeyAccessor,              // Instance of SecretKeyAccessor class. Used to fetch encryption secret 
 logger                          // Allows for logging at different log levels in a consistent manner
);
```  
`apiKey` and `environmentId` can be fetched from your dashboard in `Incountry` site.

`endpoint` defines PoP API URL and is used to override default one.

You can turn off encryption (not recommended). Set `encrypt` property to `false` if you want to do this.

#### Encryption key

`secretKeyAccessor` is used to pass a secret to perform encryption. 
Note: even though PBKDF2 is used internally to generate a cryptographically strong encryption key, you must make sure that you use strong enough password.
Here are some examples how you can use `SecretKeyAccessor`.
```
const SecretKeyAccessor = require('incountry/secret-key-accessor');

// Synchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(() => {
	return 'longAndStrongPassword'
})

// Asynchronous accessor
const secretKeyAccessor = new SecretKeyAccessor(async () => {
	const password = await getPasswordFromSomewhere();
	return password;
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

2. Writes  
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
Here is how data is transformed:
```
{  
	key, 		// hashed
	body, 		// encrypted
	profile_key,// hashed 
	range_key, 	// plain
	key2, 		// hashed
	key3 		// hashed
 }
```
3. Reads  
Stored record can be read by `key` using `readAsync` method. It accepts an object with two fields: `country` and `key`
```  
const readResponse = await storage.readAsync({  
	country: 'string',      // Required country code 
	key: 'string'           // Required record key
});  
  
// Use readResponse.status for status code, and readResponse.data for payload received.  
```  
Note that `readAsync` returns a `Promise` which is always fulfilled. Use `status` property in order check if operation was successful or not.

4. Find
It is possible to search by random keys using `find` method. 
```
const records = await storage.find(country, filter, options)
```
Parameters:
`country` - country code of the Storage,
`filter` - an object to filter records,
`options` - an object containing search options. It has the following format:
```
{
	limit: integer,
	offset: integer
}
```

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
This call returns all records with `key2` equals `kitty` AND `key3` equals `mew` OR `purr`.
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

5. Find One
If you need to find the first document matching filter, you can use the `findOne` method.
```
const record = await storage.findOne(country, filter)
```
If record not found, it will return `null`.

6. Batches  
It is possible to get a number of records by `key` at once. 
```  
// Currently only GET batches are supported  
const batchResponse = await storage.batchAsync({  
 "GET": [ // Array of strings mapping to keys ]})  
  
// Use batchResponse.status for status code, and batchResponse.data for payload received.  
```  
Note: this method is deprecated. Use `find` instead.

7. Deletes  
```  
const deleteResponse = await storage.deleteAsync({  
	country: 'string',      // Required country code 
	key: 'string'           // Required record key
});  
  
// Use deleteResponse.status for status code.  
```  
8. Logging  
You can specify a custom logger at any time as following:  
```  
const logger = {  
 write: (level, message) => { console.log(`[${level}] ${message}`) }}  
  
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
