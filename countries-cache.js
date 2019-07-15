var axios = require('axios');

class CountriesCache {
    constructor(protocol, portalHost, expiresOn) {
        this._protocol = protocol || 'http';
        this._host = portalHost || 'portal-api-staging.incountry.io';
        this._expiresOn = expiresOn || Date.now() + 30000;

        this._getUrl = `${this._protocol}://${this._host}/countries`;
        this._countries = {};
    }

    async getCountriesAsync(timeStamp) {
        if (!this._countries || !timeStamp || timeStamp >= this._expiresOn) {
            this._countries = this._hardRefreshAsync();
        }

        this._countries
        .filter(country => !!country.direct)
        .map(country => {
            return {
                "host": `${country.id.toLowerCase()}`,
                "name": country.name
            }
        });
    }

    _hardRefresh(onSuccess, onError) {
        axios.get(this._getUrl)
        .then(function(response) {
            let data = response.data;
            if (data) {
                onSuccess(data.countries);
            }
        });
    }

    async _hardRefreshAsync() {
        var response = await axios.get(this._getUrl);
        if (response.data) {
            return response.data.countries;
        }
    }
}

module.exports = CountriesCache;