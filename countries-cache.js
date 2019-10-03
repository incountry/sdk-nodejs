const axios = require('axios');
const defaultLogger = require('./logger');

class CountriesCache {
  constructor(portalHost, slidingWindowMilliseconds, expiresOn, logger) {
    this._host = portalHost || 'portal-backend.incountry.com';
    this._slidingWindowMilliseconds = slidingWindowMilliseconds || 60000;
    this._expiresOn = expiresOn || Date.now() + slidingWindowMilliseconds;
    this._getUrl = `http://${this._host}/countries`;

    this._logger = logger || defaultLogger.withBaseLogLevel('error');
  }

  async getCountriesAsync(timeStamp) {
    if (!this._countries || !timeStamp || timeStamp >= this._expiresOn) {
      this._countries = (await this._hardRefreshAsync())
        .filter((country) => !!country.direct);
    }

    return this._countries;
  }

  // eslint-disable-next-line consistent-return
  async _hardRefreshAsync() {
    try {
      this._expiresOn += this._slidingWindowMilliseconds;
      const response = await axios.get(this._getUrl);
      if (response.data) {
        return response.data.countries;
      }
    } catch (exc) {
      this._logger.write('error', exc);
      throw (exc);
    }
  }
}

module.exports = CountriesCache;
