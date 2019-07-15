var https = require('https'),
    http = require('http');

var portalDefault = 'portal-api-staging.incountry.io',
    apiDefault = 'us.staging-api.incountry.io';

class Storage {
    constructor(options) {
        this._apiKey = options.apiKey;
        this._zoneId = options.zoneId;
        this._apiHost = options.apiHost || apiDefault;
        this._portalHost = options.portalDefault || portalDefault;
        
        this._popList = {};
    }

    headers() {
        return {
            'Authorization': `Bearer ${self.apiKey}`,
            'x-zone-id': self.zoneId,
            'Content-Type': 'application/json'
        };
    }
}

module.exports = Storage;