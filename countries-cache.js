const axios = require('axios');
const defaultLogger = require('./logger');

/**
 * @typedef Country
 * @property {string} id
 * @property {string} name
 * @property {boolean} direct
 */


const COUNTRIES_CACHE_TIMEOUT = 60 * 1000;
const PORTAL_HOST = 'portal-backend.incountry.com';

class CountriesCache {
  /**
   * @param {string} portalHost Portal host [optional]
   * @param {number} timeout Expiration timeframe in ms [optional]
   * @param {number} expiresOn Timestamp when to invalidate expires [optional]
   * @param {import('./logger')} logger Logger instance [optional]
   */
  constructor(portalHost, timeout, expiresOn, logger) {
    this._host = portalHost !== undefined ? portalHost : PORTAL_HOST;
    this._getUrl = `https://${this._host}/countries`;
    this._timeout = typeof expiresOn === 'number' ? timeout : COUNTRIES_CACHE_TIMEOUT;
    this._expiresOn = typeof expiresOn === 'number' ? expiresOn : Date.now() + this._timeout;
    this._logger = logger !== undefined ? logger : defaultLogger.withBaseLogLevel('error');

    /** @type {Array<Country>|null} */
    this._countries = null;
  }

  /**
   * @param {number} timeStamp Custom timeStamp to check expiration [optional]
   * @returns {Promise<Array<Country>>}
   */
  async getCountriesAsync(timeStamp) {
    const now = typeof timeStamp === 'number' ? timeStamp : Date.now();
    if (!this._countries || now >= this._expiresOn) {
      await this._updateCountries();
      this._expiresOn = now + this._timeout;
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
    } catch (exc) {
      this._logger.write('error', exc);
      throw (exc);
    }
  }
}

module.exports = CountriesCache;
