InCountry Storage SDK
============

Usage
-----

1. Create storage instance
```
var storage = new Storage({
    apiKey: 'string',               // Required to be passed in, or as environment variable INC_API_KEY
    zoneId: 'string',               // Required to be passed in, or as environment variable INC_ZONE_ID
    endpoint: 'string url',         // Required to be passed in, or as environment variable INC_ENDPOINT
    encrypt: boolean,               // Optional, defaults to true
    overrideWithEndpoint: boolean,  // If set to true, the endpoint must also include protocol
    tls: boolean                    // [No longer used, all requests use https protocol for now]
},
    countriesCache,                 // Argument that controls cache for countries listing, currently unused
    cryptKeyAccessor,               // Allows for a secure callback to grab the secret to use for crypto
    logger                          // Allows for logging at different log levels in a consistent manner
);
```
2. Writes
```
var writeResponse = await storage.writeAsync({
    country: 'string',      // Required country code
    key: 'string',          // Required record key
    body: 'string',         // Optional payload
    profile_key: 'string',  // Optional
    range_key: 'string',    // Optional
    key2: 'string',         // Reserved for record_id
    key3: 'string'          // Reserved for field_name
});

// Use writeReponse.status for status code.
```
3. Reads
```
var readResponse = await storage.readAsync({
    country: 'string',      // Required country code
    key: 'string'           // Required record key
});

// Use readResponse.status for status code, and readResponse.data for payload received.
```
4. Batches
```
// Currently only GET batches are supported
var batchResponse = await storage.batchAsync({
    "GET": [
        // Array of strings mapping to keys
    ]
})

// Use batchResponse.status for status code, and batchResponse.data for payload received.
```
5. Deletes
```
var deleteResponse = await storage.deleteAsync({
    country: 'string',      // Required country code
    key: 'string'           // Required record key
});

// Use deleteResponse.status for status code.
```

Testing Locally
-----

1. In terminal run `npm test` for unit tests
2. In terminal run `npm run integrations` to run integration tests
