var axios = require('axios');

class CountriesCache {
    constructor(portalHost, expiresOn) {
        this._host = portalHost || 'portal-api-staging.incountry.io';
        this._expiresOn = expiresOn || Date.now() + 30000;

        this._getUrl = `http://${this._host}/countries`;
        this._countries;
    }

    async getCountriesAsync(timeStamp) {
        if (!this._countries || !timeStamp || timeStamp >= this._expiresOn) {
            this._countries = (await this._hardRefreshAsync())
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
