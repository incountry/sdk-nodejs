require('dotenv').config();
const axios = require('axios');
const queryString = require('query-string');
const crypto = require('crypto');

const defaultLogger = require('./logger');
const forEachAsync = require('./foreach-async');
const CountriesCache = require('./countries-cache');
const {InCrypt} = require('./in-crypt');

class Storage {
  constructor(options, countriesCache, cryptKeyAccessor, logger) {
    if (logger) {
      this.setLogger(logger);
    } else {
      this._logger = defaultLogger.withBaseLogLevel('debug');
    }

    this._apiKey = options.apiKey || process.env.INC_API_KEY;
    if (!this._apiKey) throw new Error('Please pass apiKey in options or set INC_API_KEY env var');

    this._envId = options.environmentId || process.env.INC_ENVIRONMENT_ID;
    if (!this._envId) throw new Error('Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');

    this._endpoint = options.endpoint || 'https://us.api.incountry.io';
    if (!this._endpoint) throw new Error('Please pass endpoint in options or set INC_ENDPOINT env var');

    if (options.encrypt !== false) {
      this._encryptionEnabled = true;
      this._crypto = new InCrypt(cryptKeyAccessor);
    }

    this._overrideWithEndpoint = options.overrideWithEndpoint;

    this._countriesCache = countriesCache || new CountriesCache();
  }

  createKeyHash(s) {
    const stringToHash = `${s}:${this._envId}`;
    return crypto.createHash('sha256').update(stringToHash, 'utf8').digest('hex');
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

  _logAndThrowError(error) {
    this._logger.write('error', error);
    throw (error);
  }

  async batchAsync(batchRequest) {
    const that = this;
    try {
      let encryptedRequest = null;
      const mappings = {};
      if (this._encryptionEnabled) {
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

      const payloadUsed = encryptedRequest || batchRequest;

      var response = await axios({
        method: 'post',
        url: endpoint,
        headers: this.headers(),
        data: payloadUsed
      });

      this._logger.write('debug', `Raw data: ${JSON.stringify(response.data)}`);
      if (response.data) {
        const results = [];
        const recordsRetrieved = response.data.GET;
        if (recordsRetrieved) {
          await forEachAsync(payloadUsed["GET"], async (requestKey, i) => {
            const match = recordsRetrieved.filter((record) => record.key === requestKey)[0];
            if (match) {
              results[i] = this._encryptionEnabled ? await that._decryptPayload(match) : match;
            } else {
              results[i] = {
                body: mappings[requestKey],
                error: 'Record not found',
              };
            }
          });
          response.data.GET = results;

          if (this._encryptionEnabled) {
            this._logger.write('debug', `Decrypted data: ${JSON.stringify(response.data)}`);
          }
        }
      }

      return response;
    } catch (err) {
      this._logger.write('error', err);
    }
  }

  _validate(request) {
    if (!request.country) throw new Error('Missing country');
    if (!request.key) throw new Error('Missing key');
  }

  async writeAsync(request) {
    try {
      this._validate(request);

      let countrycode = request.country.toLowerCase();

      var data = {
        country: countrycode,
        key: request.key
      }

      if (request.body) data['body'] = request.body;
      if (request.profileKey) data['profile_key'] = request.profileKey;
      if (request.rangeKey) data['range_key'] = request.rangeKey;
      if (request.key2) data['key2'] = request.key2;
      if (request.key3) data['key3'] = request.key3;

      var endpoint = await this._getEndpointAsync(countrycode, `v2/storage/records/${countrycode}`);

      this._logger.write("debug", `POST to: ${endpoint}`)
      if (this._encryptionEnabled) {
        this._logger.write("debug", 'Encrypting...');
        data = await this._encryptPayload(data);
      }

      this._logger.write("debug", `Raw data: ${JSON.stringify(data)}`);

      var response = await axios({
        method: 'post',
        url: endpoint,
        headers: this.headers(),
        data: data
      });

      return response;
    } catch (err) {
      this._logger.write("error", err);
      throw(err);
    }
  }

  /**
   * Find records matching filter.
   * @param {string} country - Country code.
   * @param {object} filter - The filter to apply.
   * @param {object} options - The options to pass to PoP.
   * @return {object} Matching records.
   */
  async find(country, filter, options = {}) {
    if (typeof country !== 'string') {
      this._logAndThrowError('Missing country');
    }
    const MAX_LIMIT = 100;
    if (options.limit && options.limit > MAX_LIMIT) {
      this._logAndThrowError(`Max limit is ${MAX_LIMIT}. Use offset to populate more`);
    }

    const countryCode = country.toLowerCase();
    const endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/find`);
    const data = {
      filter: this._encryptionEnabled ? this._encryptPayload(filter) : filter,
      options,
    };

    const response = await axios({
      method: 'post',
      url: endpoint,
      headers: this.headers(),
      data,
    });

    if (response.data && this._encryptionEnabled) {
      const decryptedData = await Promise.all(response.data.map((item) => this._decryptPayload(item)));
      return {
        ...response,
        data: decryptedData,
      };
    }
    return response;
  }

  async findOne(country, filter, options = {}) {
    const result = await this.find(country, filter, options);
    if (result && result.data && result.data.length) {
      return result.data[0];
    }
    return null;
  }

  async readAsync(request) {
    var response;
    try {
      this._validate(request);

      let countryCode = request.country.toLowerCase();
      let key = this._encryptionEnabled
        ? await this._crypto.encryptAsync(request.key)
        : request.key;

      var endpoint = await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${key}`);
      this._logger.write("debug", `GET from: ${endpoint}`);

      response = await axios({
        method: 'get',
        url: endpoint,
        headers: this.headers()
      });

      this._logger.write("debug", `Raw data: ${JSON.stringify(response.data)}`);
      if (this._encryptionEnabled) {
        this._logger.write("debug", 'Decrypting...')
        response.data = await this._decryptPayload(response.data)
      }
      this._logger.write("debug", `Decrypted data: ${JSON.stringify(response.data)}`);

      return response;
    } catch (err) {
      if (/Request failed with status code 404/i.test(err.message)) {
        this._logger.write("warn", "Resource not found, return key in response data with status of 404");
        return {
          data: {
            "body": undefined,
            "key": request.key,
            "key2": undefined,
            "key3": undefined,
            "profile_key": undefined,
            "range_key": undefined,
            "version": undefined,
            "env_id": undefined,
          },
          "error": `Could not find a record for key: ${request.key}`,
          "status": 404
        };
      } else {
        this._logger.write("error", err);
        throw(err);
      }
    }
  }

  async _encryptPayload(originalRecord) {
    const record = {...originalRecord};
    ['profile_key', 'key2', 'key3'].forEach((field) => {
      if (record[field] != null) {
        if (Array.isArray(record[field])) {
          record[field] = record[field].map((v) => this.createKeyHash(v));
        } else {
          record[field] = this.createKeyHash(record[field]);
        }
      }
    });
    if (record.key) {
      if (Array.isArray(record.key)) {
        record.key = await Promise.all(record.key.map((v) => this._crypto.encryptAsync(v)));
      } else {
        record.key = await this._crypto.encryptAsync(record.key);
      }
    }
    if (record.body) {
      record.body = await this._crypto.encryptAsync(record.body);
    }
    return record;
  }

  async _decryptPayload(originalRecord) {
    const record = {...originalRecord};
    if (record.body) {
      record.body = await this._crypto.decryptAsync(record.body);
    }
    if (record.key) {
      record.key = await this._crypto.decryptAsync(record.key);
    }
    return record;
  }

  async deleteAsync(request) {
    try {
      this._validate(request);

      const countryCode = request.country.toLowerCase();
      const endpoint = (await this._getEndpointAsync(countryCode, `v2/storage/records/${countryCode}/${request.key}`));
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

  async _getEndpointAsync(countryCode, path) {
    if (this._overrideWithEndpoint) {
      return `${this._endpoint}/${path}`;
    } else {
      const protocol = 'https';

      const countryRegex = new RegExp(countryCode, 'i');
      const countryToUse = (await this._countriesCache.getCountriesAsync())
        .find(country => countryRegex.test(country.id));
      const result = !!countryToUse
        ? `${protocol}://${countryCode}.api.incountry.io/${path}`
        : `${this._endpoint}/${path}`;

      return result;
    }
  }

  headers() {
    return {
      Authorization: `Bearer ${this._apiKey}`,
      'x-env-id': this._envId,
      'Content-Type': 'application/json',
    };
  }
}

module.exports = Storage;
