const axios = require('axios');
const defaultLogger = require('./logger');

const COUNTRIES_CACHE_TIMEOUT = 60 * 1000;

class CountriesCache {
  /**
   * @param {string} portalHost Portal host [optional]
   * @param {number} timeout Expiration timeframe in ms [optional]
   * @param {number} expiresOn Timestamp when to invalidate expires [optional]
   * @param {import('./logger')} logger Logger instance [optional]
   */
  constructor(portalHost, timeout, expiresOn, logger) {
    this._host = portalHost !== undefined ? portalHost : 'portal-backend.incountry.com';
    this._getUrl = `https://${this._host}/countries`;
    this._timeout = typeof expiresOn === 'number' ? timeout : COUNTRIES_CACHE_TIMEOUT;
    this._expiresOn = typeof expiresOn === 'number' ? expiresOn : Date.now() + this._timeout;
    this._logger = logger !== undefined ? logger : defaultLogger.withBaseLogLevel('error');
  }

  async getCountriesAsync(timeStamp) {
    if (!this._countries || (timeStamp !== undefined && timeStamp >= this._expiresOn)) {
      await this._updateCountries();
    }

    return this._countries;
  }

  async _updateCountries() {
    try {
      const response = await axios.get(this._getUrl);
      if (response.data) {
        this._countries = response.data.countries.filter((country) => country.direct);
      } else {
        this._countries = [];
      }

      this._expiresOn = Date.now() + this._timeout;
    } catch (exc) {
      this._logger.write('error', exc);
      throw (exc);
    }
  }
}

module.exports = CountriesCache;
