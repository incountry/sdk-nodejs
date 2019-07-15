var axios = require('axios');

class CountriesCache {
    constructor(protocol, portalHost) {
        this._protocol = protocol || 'http';
        this._host = portalHost || 'portal-api-staging.incountry.io';

        this._getUrl = `${this._protocol}://${this._host}/countries`;
    }

    hardRefresh(onSuccess, onError) {
        axios.get(this._getUrl)
        .then(function(response) {
            let data = response.data;
            if (data) {
                onSuccess(data.countries);
            }
        });
    }

    async hardRefreshAsync() {
        var response = await axios.get(this._getUrl);
        if (response.data) {
            return response.data.countries;
        }
    }
}

module.exports = CountriesCache;