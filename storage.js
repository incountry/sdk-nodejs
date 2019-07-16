var axios = require('axios'),
    CountriesCache = require('./countries-cache');

var apiDefault = 'us.staging-api.incountry.io';

class Storage {
    constructor(options, countriesCache) {
        this._apiKey = options.apiKey;
        this._zoneId = options.zoneId;
        this._apiHost = options.apiHost || apiDefault;
        this._portalHost = options.portalDefault || portalDefault;
        
        this._countriesCache = countriesCache || new CountriesCache();
    }

    headers() {
        return {
            'Authorization': `Bearer ${this._apiKey}`,
            'x-zone-id': this._zoneId,
            'Content-Type': 'application/json'
        };
    }

    writeAsync(request) {
        try {
            this._validate(request);

            //var response = axios.post()
        }
        catch(exc) {

        }
    }

    write(request, onSuccess, onFailure) {
        try {
            this._validate(request)

            axios.post(this._getEndpoint())

            onSuccess()
        }
        catch (exc) {

        }
    }

    _validate(request) {
        if (!request.country) throw new Exception('Missing country');
        if (!request.key) throw new Exception('Missing key');
    }

    _getEndpoint(country, key) {

    }
}

module.exports = Storage;
