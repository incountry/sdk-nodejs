const axios = require('axios');
const { StorageServerError } = require('./errors');

const ACTIONS = {
  read: {
    verb: 'get',
    path: (...args) => `v2/storage/records/${args[0]}/${args[1]}`,
  },
  write: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}`,
  },
  delete: {
    verb: 'delete',
    path: (...args) => `v2/storage/records/${args[0]}/${args[1]}`,
  },
  find: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}/find`,
  },
  batchWrite: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}/batchWrite`,
  },
};

const DEFAULT_POPAPI_HOST = 'https://us.api.incountry.io';

class ApiClient {
  constructor(apiKey, envId, popapiHost, loggerFn, countriesProviderFn) {
    this.apiKey = apiKey;
    this.envId = envId;
    this.host = popapiHost;
    this.loggerFn = loggerFn;
    this.countriesProviderFn = countriesProviderFn;
  }

  headers() {
    return {
      Authorization: `Bearer ${this._apiKey}`,
      'x-env-id': this._envId,
      'Content-Type': 'application/json',
    };
  }

  async getEndpoint(countryCode, path) {
    if (this.host) {
      return `${this.host}/${path}`;
    }

    const countryRegex = new RegExp(countryCode, 'i');
    let countryHasApi;
    try {
      const countriesList = await this.countriesProviderFn();
      countryHasApi = countriesList.find((country) => countryRegex.test(country.id));
    } catch (err) {
      this.loggerFn('error', err);
    }

    return countryHasApi
      ? `https://${countryCode}.api.incountry.io/${path}`
      : `${DEFAULT_POPAPI_HOST}${path}`;
  }

  /**
   * @param {string} country
   * @param {string} key
   * @param {string} action - one of [read, write, delete, find, batchWrite]
   * @param {object} data - request body
   */
  async apiClient(country, key, action, data = undefined) {
    // TODO: validate action
    const path = ACTIONS[action].path(country, key);
    const url = await this.getEndpoint(country.toLowerCase(), path);
    const method = ACTIONS[action].verb;
    this.loggerFn('debug', `${method.toUpperCase()} ${url}`);
    return axios({
      url,
      headers: this.headers(),
      method,
      data,
    }).catch((err) => {
      const storageServerError = new StorageServerError(err.code, err.response ? err.response.data : {}, `${method} ${url} ${err.message}`);
      this._logger.write('error', storageServerError);
      throw storageServerError;
    });
  }

  read(country, key) {
    return this.apiClient(country, key, 'read');
  }

  write(country, data) {
    return this.apiClient(country, undefined, 'write', data);
  }

  delete(country, key) {
    return this.apiClient(country, key, 'delete');
  }

  find(country, data) {
    return this.apiClient(country, undefined, 'find', data);
  }

  batchWrite(country, data) {
    return this.apiClient(country, undefined, 'batchWrite', data);
  }
}

module.exports = {
  ApiClient,
  POPAPI_ACTIONS: ACTIONS,
};
