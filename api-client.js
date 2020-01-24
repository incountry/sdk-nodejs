const axios = require('axios');
const { StorageServerError } = require('./errors');
const pjson = require('./package.json');
const { validateRecord } = require('./validation/record');
const { validateFindResponse } = require('./validation/api-responses/find-response');
const { validateWriteResponse } = require('./validation/api-responses/write-response');
const { isError } = require('./errors');

const SDK_VERSION = pjson.version;

/**
 * @typedef ApiClientAction
 * @property {string} verb
 * @property {(country: string, key?: string) => string} path - function(country, key?)
 * @property {(responseData: any) => any} [validateResponse]
 */

/** @type {Object.<string, ApiClientAction>} */
const ACTIONS = {
  read: {
    verb: 'get',
    path: (...args) => `v2/storage/records/${args[0]}/${args[1]}`,
    validateResponse: (responseData) => validateRecord(responseData),
  },
  write: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}`,
    validateResponse: (responseData) => validateWriteResponse(responseData),
  },
  delete: {
    verb: 'delete',
    path: (...args) => `v2/storage/records/${args[0]}/${args[1]}`,
  },
  find: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}/find`,
    validateResponse: (responseData) => validateFindResponse(responseData),
  },
  batchWrite: {
    verb: 'post',
    path: (...args) => `v2/storage/records/${args[0]}/batchWrite`,
    validateResponse: (responseData) => validateWriteResponse(responseData),
  },
};

const DEFAULT_POPAPI_HOST = 'https://us.api.incountry.io';

class ApiClient {
  /**
   * @param {string} apiKey
   * @param {string} envId
   * @param {string} popapiHost
   * @param {(logLevel: string, message: any) => void} loggerFn
   * @param {function} countriesProviderFn - async function()
   */
  constructor(apiKey, envId, popapiHost, loggerFn, countriesProviderFn) {
    this.apiKey = apiKey;
    this.envId = envId;
    this.host = popapiHost;
    this.loggerFn = loggerFn;
    this.countriesProviderFn = countriesProviderFn;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'x-env-id': this.envId,
      'Content-Type': 'application/json',
      'User-Agent': `SDK-Node.js/${SDK_VERSION}`,
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
      : `${DEFAULT_POPAPI_HOST}/${path}`;
  }

  tryValidate(validationResult) {
    if (isError(validationResult)) {
      this.loggerFn('error', validationResult.message);
      throw validationResult;
    }
  }

  /**
   * @param {string} country
   * @param {string} key
   * @param {('read'|'write'|'delete'|'find'|'batchWrite')} action
   * @param {object} data - request body
   */
  async runQuery(country, key, action, data = undefined) {
    const chosenAction = ACTIONS[action];
    if (!chosenAction) {
      throw new Error('Invalid action passed to ApiClient.');
    }

    const path = chosenAction.path(country, key);
    const url = await this.getEndpoint(country.toLowerCase(), path);
    const method = chosenAction.verb;
    this.loggerFn('debug', `${method.toUpperCase()} ${url}`);
    let response;
    try {
      response = await axios({
        url,
        headers: this.headers(),
        method,
        data,
      });
    } catch (err) {
      const storageServerError = new StorageServerError(err.code, err.response ? err.response.data : {}, `${method.toUpperCase()} ${url} ${err.message}`);
      this.loggerFn('error', storageServerError);
      throw storageServerError;
    }

    if (chosenAction.validateResponse) {
      this.tryValidate(chosenAction.validateResponse(response.data));
    }

    return response.data;
  }

  read(country, key) {
    return this.runQuery(country, key, 'read');
  }

  write(country, data) {
    return this.runQuery(country, undefined, 'write', data);
  }

  delete(country, key) {
    return this.runQuery(country, key, 'delete');
  }

  find(country, data) {
    return this.runQuery(country, undefined, 'find', data);
  }

  batchWrite(country, data) {
    return this.runQuery(country, undefined, 'batchWrite', data);
  }
}

module.exports = {
  ApiClient,
};
