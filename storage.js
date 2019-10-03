require('dotenv').config();
const axios = require('axios');

const defaultLogger = require('./logger');
const forEachAsync = require('./foreach-async');
const CountriesCache = require('./countries-cache');
const { InCrypt } = require('./in-crypt');

class Storage {
  constructor(options, countriesCache, cryptKeyAccessor, logger) {
    if (logger) {
      this.setLogger(logger);
    } else {
      this._logger = defaultLogger.withBaseLogLevel('debug');
    }

    this._apiKey = options.apiKey || process.env.INC_API_KEY;
    if (!this._apiKey) throw new Error('Please pass apiKey in options or set INC_API_KEY env var');

    this._zoneId = options.zoneId || process.env.INC_ZONE_ID;
    if (!this._zoneId) throw new Error('Please pass zoneId in options or set INC_ZONE_ID env var');

    this._endpoint = options.endpoint || process.env.INC_ENDPOINT;
    if (!this._endpoint) throw new Error('Please pass endpoint in options or set INC_ENDPOINT env var');

    if (options.encrypt) {
      this._encrypt = options.encrypt;
      this._crypto = new InCrypt(cryptKeyAccessor);
    }

    this._overrideWithEndpoint = options.overrideWithEndpoint;

    this._countriesCache = countriesCache || new CountriesCache();
  }

  setLogger(logger) {
    if (!logger) {
      throw new Error('Please specify a logger');
    }
    if (logger.write || typeof logger.write !== 'function') {
      throw new Error('Logger must implement write function');
    }
    if (logger.write.length < 2) {
      throw new Error('Logger.write must have at least 2 parameters');
    }
    this._logger = logger;
  }

  async batchAsync(batchRequest) {
    const that = this;
    try {
      let encryptedRequest = null;
      const mappings = {};
      if (this._encrypt) {
        const keysToSend = [];
        await forEachAsync(batchRequest.GET, async (key, i) => {
          const encrypted = await that._crypto.encryptAsync(key);
          keysToSend[i] = encrypted;
          mappings[encrypted] = key;
        });

        encryptedRequest = {
          GET: keysToSend,
        };
      }

      const countryCode = batchRequest.country.toLowerCase();
      const endpoint = await this._getEndpointAsync(countryCode, `v2/storage/batches/${countryCode}`);
      this._logger.write('debug', `POST from: ${endpoint}`);

      const response = await axios({
        method: 'post',
        url: endpoint,
        headers: this.headers(),
        data: encryptedRequest || batchRequest,
      });

      this._logger.write('debug', `Raw data: ${JSON.stringify(response.data)}`);
      if (response.data) {
        const results = [];
        const recordsRetrieved = response.data.GET;
        if (recordsRetrieved) {
          await forEachAsync(encryptedRequest.GET, async (requestKey, i) => {
            const match = recordsRetrieved.filter((record) => record.key === requestKey)[0];
            if (match) {
              results[i] = this._encrypt ? await that._decryptIt(match) : match;
            } else {
              results[i] = {
                body: mappings[requestKey],
                error: 'Record not found',
              };
            }
          });
          response.data.GET = results;

          if (this._encrypt) {
            this._logger.write('debug', `Decrypted data: ${JSON.stringify(response.data)}`);
          }
        }
      }

      return response;
    } catch (err) {
      this._logger.write('error', err);
    }
  }

  async writeAsync(request) {
    try {
      Storage._validate(request);

      const countrycode = request.country.toLowerCase();

      let data = {
        country: countrycode,
        key: request.key,
      };

      if (request.body) data.body = request.body;
      if (request.profileKey) data.profile_key = request.profileKey;
      if (request.rangeKey) data.range_key = request.rangeKey;
      if (request.key2) data.key2 = request.key2;
      if (request.key3) data.key3 = request.key3;

      const endpoint = await this._getEndpointAsync(countrycode, `v2/storage/records/${countrycode}`);

      this._logger.write('debug', `POST to: ${endpoint}`);
      if (this._encrypt) {
        this._logger.write('debug', 'Encrypting...');
        data = await this._encryptIt(data);
      }

      this._logger.write('debug', `Raw data: ${JSON.stringify(data)}`);

      const response = await axios({
        method: 'post',
        url: endpoint,
        headers: this.headers(),
        data,
      });

      return response;
    } catch (err) {
      this._logger.write('error', err);
      throw (err);
    }
  }

  async _encryptIt(record) {
    const that = this;
    return new Promise(((resolve, reject) => {
      try {
        const result = {};

        forEachAsync(
          [
            'key',
            'body',
            'profile_key',
            'key2',
            'key3',
          ], async (key) => {
            if (record[key]) {
              result[key] = await that._crypto.encryptAsync(record[key]);
            }
          },
        ).then(() => { resolve(result); });
      } catch (err) {
        reject(err);
      }
    }));
  }

  async readAsync(request) {
    let response;
    try {
      Storage._validate(request);

      const countryCode = request.country.toLowerCase();
      const key = this._encrypt
        ? await this._crypto.encryptAsync(request.key)
        : request.key;

      const endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`);
      this._logger.write('debug', `GET from: ${endpoint}`);

      response = await axios({
        method: 'get',
        url: endpoint,
        headers: this.headers(),
      });

      this._logger.write('debug', `Raw data: ${JSON.stringify(response.data)}`);
      if (this._encrypt) {
        this._logger.write('debug', 'Decrypting...');
        response.data = await this._decryptIt(response.data);
      }
      this._logger.write('debug', `Decrypted data: ${JSON.stringify(response.data)}`);

      return response;
    } catch (err) {
      if (/Request failed with status code 404/i.test(err.message)) {
        this._logger.write('warn', 'Resource not found, return key in response data with status of 404');
        return {
          data: {
            body: undefined,
            key: request.key,
            key2: undefined,
            key3: undefined,
            profile_key: undefined,
            range_key: undefined,
            version: undefined,
            zone_id: undefined,
          },
          error: `Could not find a record for key: ${request.key}`,
          status: 404,
        };
      }

      this._logger.write('error', err);
      throw (err);
    }
  }

  async _decryptIt(record) {
    const that = this;
    return new Promise(((resolve, reject) => {
      try {
        const result = {};

        forEachAsync(
          [
            'key',
            'body',
            'profile_key',
            'key2',
            'key3',
          ], async (key) => {
            if (record[key]) {
              result[key] = await that._crypto.decryptAsync(record[key]);
            }
          },
        ).then(() => { resolve(result); });
      } catch (err) {
        reject(err);
      }
    }));
  }

  async deleteAsync(request) {
    try {
      Storage._validate(request);

      const countryCode = request.country.toLowerCase();
      const key = this._encrypt
        ? await this._crypto.encryptAsync(request.key)
        : request.key;

      const endpoint = (await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`));
      this._logger.write('debug', `DELETE from: ${endpoint}`);

      const response = await axios({
        method: 'delete',
        url: endpoint,
        headers: this.headers(),
      });

      return response;
    } catch (err) {
      this._logger.write('error', err);
      throw (err);
    }
  }

  static _validate(request) {
    if (!request.country) throw new Error('Missing country');
    if (!request.key) throw new Error('Missing key');
  }

  async _getEndpointAsync(countryCode, path) {
    // Hard-coded for now, since we only currently support https
    // When support for other protocols becomes availavle,
    //  we will add a protocol field in the options passed into the constructor.
    const protocol = 'https';

    if (this._overrideWithEndpoint) {
      return `${this._endpoint}/${path}`;
    }

    // Todo: Fix: Experimental for now
    // var countryRegex = new RegExp(countryCode, 'i');
    // var countryToUse = (await this._countriesCache.getCountriesAsync())
    //     .filter(country => countryRegex.test(country.id))
    //     [0];
    return `${protocol}://${countryCode}.api.incountry.io/${path}`;
  }

  headers() {
    return {
      Authorization: `Bearer ${this._apiKey}`,
      'x-zone-id': this._zoneId,
      'Content-Type': 'application/json',
    };
  }
}

module.exports = Storage;
