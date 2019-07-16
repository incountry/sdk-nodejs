var axios = require('axios');

class CountriesCache {
    constructor(protocol, portalHost, expiresOn) {
        this._protocol = protocol || 'http';
        this._host = portalHost || 'portal-api-staging.incountry.io';
        this._expiresOn = expiresOn || Date.now() + 30000;

        this._getUrl = `${this._protocol}://${this._host}/countries`;
        this._countries;
    }

    async getBaseUrlAsync(countryCode) {
        var regex = new RegExp(countryCode, 'i');
        var country = this._countries.filter(country => regex.test(country.id))[0];

        if (country)
        {
            return `${protocol}://${countryCode.toLowerCase()}.api.incountry.io/`
        }
    }

    async getCountriesAsync(timeStamp) {
        if (!this._countries || !timeStamp || timeStamp >= this._expiresOn) {
            this._countries = this
                ._hardRefreshAsync()
                .filter(country => !!country.direct);
        }

        return this._countries;
    }

    async _hardRefreshAsync() {
        try {
            var response = await axios.get(this._getUrl);
            if (response.data) {
                return response.data.countries;
            }
        }
        catch (exc) {
            console.log(exc);
            throw(exc);
        }
    }
}

module.exports = CountriesCache;
