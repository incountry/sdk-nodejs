require('dotenv').config();

var forEachAsync = require('./foreach-async');

var axios = require('axios'),
    CountriesCache = require('./countries-cache'),
    InCrypt = require('./in-crypt').InCrypt;

class Storage {
    constructor(options, countriesCache, cryptKeyAccessor, logger) {
        this._logger = logger || require('./logger').withBaseLogLevel('debug');

        this._apiKey = options.apiKey || process.env.INC_API_KEY;
        if (!this._apiKey) throw new Error('Please pass apiKey in options or set INC_API_KEY env var')

        this._zoneId = options.zoneId || process.env.INC_ZONE_ID;
        if (!this._zoneId) throw new Error('Please pass zoneId in options or set INC_ZONE_ID env var')

        this._endpoint = options.endpoint || process.env.INC_ENDPOINT;
        if (!this._endpoint) throw new Error('Please pass endpoint in options or set INC_ENDPOINT env var')

        if (!!options.encrypt) {
            this._encrypt = options.encrypt;
            this._crypto = new InCrypt(cryptKeyAccessor);
        }

        this._overrideWithEndpoint = options.overrideWithEndpoint;

        this._countriesCache = countriesCache || new CountriesCache();
    }

    async batchAsync(batchRequest) {
        var that = this;
        try {
            var encryptedRequest = null;
            var mappings = {};
            if (this._encrypt) {
                var keysToSend = [];
                await forEachAsync(batchRequest["GET"], async (key, i) => {
                    var encrypted = await that._crypto.encryptAsync(key);
                    keysToSend[i] = encrypted;
                    mappings[encrypted] = key;
                });

                encryptedRequest = {
                    "GET": keysToSend
                }
            }

            let countryCode = batchRequest.country.toLowerCase();
            var endpoint = await this._getEndpointAsync(countryCode, `v2/storage/batches/${countryCode}`);
            this._logger.write("debug", `POST from: ${endpoint}`);

            var response = await axios({
                method: 'post',
                url: endpoint,
                headers: this.headers(),
                data: encryptedRequest || batchRequest
            });

            this._logger.write("debug", `Raw data: ${JSON.stringify(response.data)}`);
            if (response.data) {
                var results = []
                var recordsRetrieved = response.data["GET"];
                if (recordsRetrieved) {
                    await forEachAsync(encryptedRequest["GET"], async (requestKey, i) => {
                        var match = recordsRetrieved.filter(record => record.key == requestKey)[0];
                        if (match) {
                            results[i] = this._encrypt ? await that._decryptIt(match) : match;
                        }
                        else {
                            results[i] = {
                                "body": mappings[requestKey],
                                "error": "Record not found"
                            }
                        }
                    });
                    response.data["GET"] = results;

                    if (this._encrypt) {
                        this._logger.write("debug", `Decrypted data: ${JSON.stringify(response.data)}`);
                    }
                }
            }

            return response;
        }
        catch (err) {
            this._logger.write("error", err);
        }
    }

    async writeAsync(request) {
        try {
            this._validate(request);

            let countrycode = request.country.toLowerCase();

            var data = {
                country: countrycode,
                key: request.key
            }

            if (request.body) data['body'] = request.body;
            if (request.profileKey) data['profile_key'] = request.profileKey;
            if (request.rangeKey) data['range_key'] = request.rangeKey;
            if (request.key2) data['key2'] = request.key2;
            if (request.key3) data['key3'] = request.key3;

            var endpoint = await this._getEndpointAsync(countrycode, `v2/storage/records/${countrycode}`);
            
            this._logger.write("debug", `POST to: ${endpoint}`)
            if (this._encrypt) {
                this._logger.write("debug", 'Encrypting...');
                data = await this._encryptIt(data);
            }

            this._logger.write("debug", `Raw data: ${JSON.stringify(data)}`);

            var response = await axios({
                method: 'post',
                url: endpoint,
                headers: this.headers(),
                data: data
            });

            return response;
        }
        catch(err) {
            this._logger.write("error", err);
            throw(err);
        }
    }

    async _encryptIt(record) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var result = {};

                forEachAsync(
                [
                    'key',
                    'body',
                    'profile_key',
                    'key2',
                    'key3'
                ], async (key) => {
                    if (record[key]) {
                        result[key] = await that._crypto.encryptAsync(record[key]);
                    }
                }).then(r => { resolve(result); });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    async readAsync(request) {
        var response;
        try {
            this._validate(request);

            let countryCode = request.country.toLowerCase();
            let key = this._encrypt
                ? await this._crypto.encryptAsync(request.key)
                : request.key;

            var endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`);
            this._logger.write("debug", `GET from: ${endpoint}`);
            
            response = await axios({
                method: 'get',
                url: endpoint,
                headers: this.headers()
            });

            this._logger.write("debug", `Raw data: ${JSON.stringify(response.data)}`);
            if (this._encrypt) {
                this._logger.write("debug", 'Decrypting...')
                response.data = await this._decryptIt(response.data)
            }
            this._logger.write("debug", `Decrypted data: ${JSON.stringify(response.data)}`);

            return response;
        }
        catch (err) {
            if (/Request failed with status code 404/i.test(err.message)) {
                this._logger.write("warn", "Resource not found, return key in response data with status of 404");
                return {
                    data: {
                        "body": undefined,
                        "key": request.key,
                        "key2": undefined,
                        "key3": undefined,
                        "profile_key": undefined,
                        "range_key": undefined,
                        "version": undefined,
                        "zone_id": undefined,
                    },
                    "error": `Could not find a record for key: ${request.key}`,
                    "status": 404
                };
            }
            else {
                this._logger.write("error", err);
                throw(err);
            }
        }
    }

    async _decryptIt(record) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                var result = {};

                forEachAsync(
                [
                    'key',
                    'body',
                    'profile_key',
                    'key2',
                    'key3'
                ], async function(key) {
                    if (record[key]) {
                        result[key] = await that._crypto.decryptAsync(record[key]);
                    }
                }).then(r => { resolve(result); });
            }
            catch (err) {
                reject(err)
            }
        });
    }

    async deleteAsync(request) {
        try {
            this._validate(request);

            let countryCode = request.country.toLowerCase();
            let key = this._encrypt
                ? await this._crypto.encryptAsync(request.key)
                : request.key;
                
            let endpoint = (await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`))
            this._logger.write("debug", `DELETE from: ${endpoint}`);

            var response = await axios({
                method: 'delete',
                url: endpoint,
                headers: this.headers()
            });

            return response;
        }
        catch (err) {
            this._logger.write("error", err);
            throw(err);
        }
    }

    _validate(request) {
        if (!request.country) throw new Error('Missing country');
        if (!request.key) throw new Error('Missing key');
    }

    async _getEndpointAsync(countryCode, path) {
        // Hard-coded for now, since we only currently support https
        // When support for other protocols becomes availavle,
        //  we will add a protocol field in the options passed into the constructor.
        var protocol = 'https';

        if (this._overrideWithEndpoint) {
            return `${this._endpoint}/${path}`;
        }
        else {
            // Todo: Fix: Experimental for now
            // var countryRegex = new RegExp(countryCode, 'i');
            // var countryToUse = (await this._countriesCache.getCountriesAsync())
            //     .filter(country => countryRegex.test(country.id))
            //     [0];
            return `${protocol}://${countryCode}.api.incountry.io/${path}`;
        }
    }

    headers() {
        return {
            'Authorization': `Bearer ${this._apiKey}`,
            'x-zone-id': this._zoneId,
            'Content-Type': 'application/json'
        };
    }
}

module.exports = Storage;
