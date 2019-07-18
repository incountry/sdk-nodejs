require('dotenv').config();

var axios = require('axios'),
    CountriesCache = require('./countries-cache');

var apiDefault = 'us.staging-api.incountry.io';

class Storage {
    constructor(options, countriesCache) {
        this._apiKey = options.apiKey || process.env.INC_API_KEY;
        if (!this._apiKey) throw new Error('Please pass apiKey in options or set INC_API_KEY env var')

        this._zoneId = options.zoneId || process.env.INC_ZONE_ID;
        if (!this._zoneId) throw new Error('Please pass zoneId in options or set INC_ZONE_ID env var')

        this._endpoint = options.endpoint || process.env.INC_ENDPOINT;
        if (!this._endpoint) throw new Error('Please pass endpoint in options or set INC_ENDPOINT env var')

        if (!!options.encrpt) {
            this._encrypt = options.encrpt;
            this._secretKey = options.secretKey || process.env.INC_SECRET_KEY;
            if (!this._secretKey) throw new Error('Encryption is on. Please pass secretKey in options or set INC_SECRET_KEY env var')
        }
        
        this._tls = options.tls;

        this._countriesCache = countriesCache || new CountriesCache();

        console.log(JSON.stringify(this));
    }

    async writeAsync(request) {
        try {
            this._validate(request);

            let countrycode = request.country.toLowerCase();

            let data = {
                country: countrycode,
                key: request.key
            }

            if (request.body) data['body'] = request.body;
            if (request.profileKey) data['profile_key'] = request.profileKey;
            if (request.rangeKey) data['range_key'] = request.rangeKey;
            if (request.key2) data['key2'] = request.key2;
            if (request.key3) data['key3'] = request.key3;

            var endpoint = (await this._getEndpointAsync(countrycode, `v2/storage/records/${countrycode}`))
            console.log(`POST to: ${endpoint}`)

            // Not yet working
            if (this._encrypt) {

            }

            var response = await axios({
                method: 'post',
                url: endpoint,
                headers: this.headers(),
                data: data
            });

            return response;
        }
        catch(exc) {
            console.log(exc);
            throw(exc);
        }
    }

    _encrypt(record) {

    }

    async readAsync(request) {
        try {
            this._validate(request);

            let countryCode = request.country.toLowerCase();
            let key = request.key;
            var endpoint = (await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`))
            console.log(`GET from: ${endpoint}`);
            
            var response = await axios({
                method: 'get',
                url: endpoint,
                headers: this.headers()
            });

            return response;
        }
        catch (exc) {
            // log
            console.log(exc);
            throw(exc);
        }
    }

    _decrypt(record) {
        
    }

    async deleteAsync(request) {
        try {
            this._validate(request);

            let countryCode = request.country.toLowerCase();
            let key = request.key;
            let endpoint = (await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`))
            console.log(`DELETE from: ${endpoint}`);

            var response = await axios({
                method: 'delete',
                url: endpoint,
                headers: this.headers()
            });

            return response;
        }
        catch (exc) {
            console.log(exc);
            throw(exc);
        }
    }

    _validate(request) {
        if (!request.country) throw new Error('Missing country');
        if (!request.key) throw new Error('Missing key');
    }

    async _getEndpointAsync(countryCode, path) {
        var protocol = !!this._tls ? 'https' : 'http';

        var countryRegex = new RegExp(countryCode, 'i');
        var countryToUse = (await this._countriesCache.getCountriesAsync())
            .filter(country => countryRegex.test(country.id))
            [0];

        if (countryToUse) {
            //console.log('Country came back as direct')
            return `${protocol}://${countryCode}.api.incountry.io/${path}`;
        } else {
            // This might not be what we want, still under discussion
            //console.log('Country not found, forwarding to us for minipop reroute...')
            return `${protocol}://${this._endpoint}/${path}`;
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
