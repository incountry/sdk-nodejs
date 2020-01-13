/* eslint-disable */
const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const sinon = require('sinon');
const uuid = require('uuid/v4');
const _ = require('lodash');
const Storage = require('../../storage');
const { StorageServerError } = require('../../errors');
const CountriesCache = require('../../countries-cache');
const SecretKeyAccessor = require('../../secret-key-accessor');

const { expect, assert } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_URL = `https://${COUNTRY}.api.incountry.io`;

const TEST_RECORDS = [
  { "country": COUNTRY, "key": uuid(), version: 0 },
  { "country": COUNTRY, "key": uuid(), "body": "test", version: 0 },
  { "country": COUNTRY, "key": uuid(), "body": "test", "key2": "key2", version: 0 },
  { "country": COUNTRY, "key": uuid(), "body": "test", "key2": "key2", "key3": "key3", version: 0 },
  {
    "country": COUNTRY,
    "key": uuid(),
    "body": "test",
    "key2": "key2",
    "key3": "uniqueKey3",
    "profile_key": "profile_key",
    version: 0
  },
  {
    "country": COUNTRY,
    "key": uuid(),
    "body": "test",
    "key2": "key2",
    "key3": "key3",
    "profile_key": "profile_key",
    "range_key": 1,
    version: 0
  },
]

function createFakeCountriesCache(countries) {
  const countriesCache = new CountriesCache();
  countriesCache.getCountriesAsync = async () => countries;
  return countriesCache;
}

describe('Storage', () => {
  describe('interface methods', () => {
    const logger = { write: (a, b) => [a, b] };
    const loggerSpy = sinon.spy(logger, 'write');
    const customStorageEndpoint = 'https://test.example';

    const countriesCache = createFakeCountriesCache([
      { id: 'BE', name: 'Belgium', direct: true },
      { id: 'HU', name: 'Hungary', direct: true },
    ]);

    const createDefaultStorageWithLogger = () => new Storage({ apiKey: 'string', environmentId: 'string' }, undefined, logger);

    const createStorageWithCustomEndpointLoggerAndKeyAccessorNoEnc = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: false,
      endpoint: customStorageEndpoint,
    }, new SecretKeyAccessor(() => SECRET_KEY), logger);

    const createStorageWithCustomCountriesCacheLoggerAndKeyAccessorNoEnc = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: false,
    }, new SecretKeyAccessor(() => SECRET_KEY), logger, countriesCache);

    const createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      endpoint: POPAPI_URL,
      encrypt: false,
    }, new SecretKeyAccessor(() => SECRET_KEY), logger);

    const createStorageWithPOPAPIEndpointLoggerAndKeyAccessor = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      endpoint: POPAPI_URL,
    }, new SecretKeyAccessor(() => SECRET_KEY), logger);

    beforeEach(() => {
      nock.disableNetConnect();
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('constructor arguments check', () => {
      describe('options', () => {
        describe('apiKey', () => {
          let envApiKey;

          beforeEach(() => {
            envApiKey = process.env.INC_API_KEY;
            delete process.env.INC_API_KEY;
          });

          afterEach(() => {
            process.env.INC_API_KEY = envApiKey;
          });

          it('should be provided via either options or environment variable', () => {
            expect(() => new Storage({}))
              .to.throw(Error, 'Please pass apiKey in options or set INC_API_KEY env var');

            expect(() => new Storage({ apiKey: undefined }))
              .to.throw(Error, 'Please pass apiKey in options or set INC_API_KEY env var');

            expect(() => new Storage({ apiKey: 'apiKey', environmentId: 'envId' })).not.to.throw();

            process.env.INC_API_KEY = 'apiKey';

            expect(() => new Storage({ environmentId: 'envId' })).not.to.throw();
          });
        });

        describe('environmentId', () => {
          let envEnvironmentId;

          beforeEach(() => {
            envEnvironmentId = process.env.INC_ENVIRONMENT_ID;
            delete process.env.INC_ENVIRONMENT_ID;
          });

          afterEach(() => {
            process.env.INC_ENVIRONMENT_ID = envEnvironmentId;
          });

          it('should be provided via either options or environment variable', () => {
            expect(() => new Storage({ apiKey: 'apiKey' }))
              .to.throw(Error, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');

            expect(() => new Storage({ apiKey: 'apiKey', environmentId: undefined }))
              .to.throw(Error, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');

            expect(() => new Storage({ apiKey: 'apiKey', environmentId: 'envId' })).not.to.throw();

            process.env.INC_ENVIRONMENT_ID = 'envId';

            expect(() => new Storage({ apiKey: 'apiKey' })).not.to.throw();
          });
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', () => {
          const expectStorageConstructorThrowsError = (logger) => {
            expect(() => new Storage(undefined, undefined, logger, undefined))
              .to.throw(Error, 'Logger must implement write function');
          };

          let wrongLogger = 42;
          expectStorageConstructorThrowsError(wrongLogger);

          wrongLogger = () => null;
          expectStorageConstructorThrowsError(wrongLogger);

          wrongLogger = {};
          expectStorageConstructorThrowsError(wrongLogger);

          wrongLogger = { write: 'write' };
          expectStorageConstructorThrowsError(wrongLogger);

          wrongLogger = { write: {} };
          expectStorageConstructorThrowsError(wrongLogger);
        });

        it('should throw an error if provided logger.write is a function with less than 2 arguments', () => {
          const expectStorageConstructorThrowsError = (logger) => {
            expect(() => new Storage(undefined, undefined, logger, undefined))
              .to.throw(Error, 'Logger.write must have at least 2 parameters');
          };

          const expectStorageConstructorNotThrowsError = (logger) => {
            expect(() => new Storage({
              apiKey: 'string',
              environmentId: 'string',
            }, undefined, logger, undefined)).not.to.throw();
          };

          let _logger = { write: () => null };
          expectStorageConstructorThrowsError(_logger);

          _logger = { write: (a) => a };
          expectStorageConstructorThrowsError(_logger);

          _logger = { write: (a, b) => [a, b] };
          expectStorageConstructorNotThrowsError(_logger);

          _logger = { write: (a, b, c) => [a, b, c] };
          expectStorageConstructorNotThrowsError(_logger);
        });
      });
    });

    describe('setLogger', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(() => {
        storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
      });

      it('should throw an error if called without arguments', () => {
        expect(() => storage.setLogger()).to.throw(Error, 'Please specify a logger');
      });

      it('should throw an error if called with falsy argument', () => {
        expect(() => storage.setLogger(null)).to.throw(Error, 'Please specify a logger');
        expect(() => storage.setLogger(undefined)).to.throw(Error, 'Please specify a logger');
        expect(() => storage.setLogger(false)).to.throw(Error, 'Please specify a logger');
      });

      it('should throw an error if provided logger is not object or has no "write" method or is not a function', () => {
        const expectSetLoggerThrowsError = (logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(Error, 'Logger must implement write function');
        };

        let wrongLogger = 42;
        expectSetLoggerThrowsError(wrongLogger);

        wrongLogger = () => null;
        expectSetLoggerThrowsError(wrongLogger);

        wrongLogger = {};
        expectSetLoggerThrowsError(wrongLogger);

        wrongLogger = { write: 'write' };
        expectSetLoggerThrowsError(wrongLogger);

        wrongLogger = { write: {} };
        expectSetLoggerThrowsError(wrongLogger);
      });

      it('should throw an error if provided logger.write is a function with less than 2 arguments', () => {
        const expectSetLoggerThrowsError = (logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(Error, 'Logger.write must have at least 2 parameters');
        };

        const expectSetLoggerNotThrowsError = (logger) => {
          expect(() => storage.setLogger(logger)).not.to.throw();
        };

        let _logger = { write: () => null };
        expectSetLoggerThrowsError(_logger);

        _logger = { write: (a) => a };
        expectSetLoggerThrowsError(_logger);

        _logger = { write: (a, b) => [a, b] };
        expectSetLoggerNotThrowsError(_logger);

        _logger = { write: (a, b, c) => [a, b, c] };
        expectSetLoggerNotThrowsError(_logger);
      });
    });

    describe('setSecretKeyAccessor', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(() => {
        storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
      });

      it('should throw an error if not instance of SecretKeyAccessor was passed as argument', () => {
        const expectSetSecretKeyAccessorThrowsError = (arg) => {
          expect(() => storage.setSecretKeyAccessor(arg)).to.throw(Error, 'secretKeyAccessor must be an instance of SecretKeyAccessor');
        };
        expectSetSecretKeyAccessorThrowsError(null);
        expectSetSecretKeyAccessorThrowsError(false);
        expectSetSecretKeyAccessorThrowsError({});
        expect(() => storage.setSecretKeyAccessor(new SecretKeyAccessor(() => null))).not.to.throw();
      });
    });

    describe('setCountriesCache', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(() => {
        storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
      });

      it('should throw an error if not instance of CountriesCache was passed as argument', () => {
        const expectSetCountriesCacheThrowsError = (arg) => {
          expect(() => storage.setCountriesCache(arg)).to.throw(Error, 'You must pass an instance of CountriesCache');
        };
        expectSetCountriesCacheThrowsError();
        expectSetCountriesCacheThrowsError(null);
        expectSetCountriesCacheThrowsError(undefined);
        expectSetCountriesCacheThrowsError(false);
        expectSetCountriesCacheThrowsError({});
        expect(() => storage.setCountriesCache(new CountriesCache())).not.to.throw();
      });
    });

    describe('writeAsync', () => {
      const popAPIResponse = { success: true };

      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();

          nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}`)
            .reply(200);
        });

        describe('when the request has no country field', () => {
          it('should throw an error and log it', async () => {
            const request = {};
            await expect(storage.writeAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error and log it', async () => {
            const request = { country: '123' };
            await expect(storage.writeAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe.skip('POPAPI endpoint', () => {
        describe('if the endpoint was set during storage creation', () => {
          const storage = new Storage({
            apiKey: 'string',
            environmentId: 'string',
            endpoint: customStorageEndpoint,
          }, new SecretKeyAccessor(() => SECRET_KEY), logger);

          it('should use the provided endpoint', async () => {
            const popAPI = nock(customStorageEndpoint)
              .post(`/v2/storage/records/${COUNTRY}`)
              .reply(200, popAPIResponse);

            await storage.writeAsync(TEST_RECORDS[0]);
            assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          });
        });

        describe('otherwise it should request country data from CountriesCache', () => {
          const storage = new Storage({
            apiKey: 'string',
            environmentId: 'string',
          }, new SecretKeyAccessor(() => SECRET_KEY), logger, countriesCache);

          it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
            const country = 'hu';
            const popAPIUrl = `https://${country}.api.incountry.io`;
            const request = { country, key: uuid(), version: 0 };

            const popAPI = nock(popAPIUrl)
              .post(`/v2/storage/records/${country}`)
              .reply(200, popAPIResponse);

            await storage.writeAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });

          it('should use the default endpoint otherwise', async () => {
            const country = 'ae';
            const request = { country, key: uuid(), version: 0 };

            const popAPI = nock(POPAPI_URL)
              .post(`/v2/storage/records/${country}`)
              .reply(200, popAPIResponse);

            await storage.writeAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });
      });

      describe('encryption', () => {
        describe('when disabled', () => {
          const request = {
            country: COUNTRY,
            key: uuid(),
            version: 0,
            body: 'test',
          };

          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

          it.skip('should encrypt payload', (done) => {
            const popAPI = nock(POPAPI_URL)
              .post(`/v2/storage/records/${COUNTRY}`)
              .reply(200, popAPIResponse);

            popAPI.on('request', async (req, interceptor, reqBody) => {
              const bodyObj = JSON.parse(reqBody);
              expect(bodyObj.body).to.not.equal(request.body);
              done();
            });

            storage.writeAsync(request);
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error and log it', async () => {
          const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          const scope = nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}`)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(storage.writeAsync(TEST_RECORDS[0])).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });

    describe('readAsync', () => {
      const popAPIResponse = { success: true };

      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();
        });

        describe('when the request has no country field', () => {
          it('should throw an error and log it', async () => {
            const request = {};
            await expect(storage.readAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error and log it', async () => {
            const request = { country: '123' };
            await expect(storage.readAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe.skip('POPAPI endpoint', () => {
        describe('if the endpoint was set during storage creation', () => {
          const storage = createStorageWithCustomEndpointLoggerAndKeyAccessorNoEnc();

          it('should use the provided endpoint', async () => {
            const key = 'test';
            const request = { country: COUNTRY, key };
            const encryptedPayload = await storage._encryptPayload(request);

            const popAPI = nock(customStorageEndpoint)
              .get(`/v2/storage/records/${COUNTRY}/${encryptedPayload.key}`)
              .reply(200, popAPIResponse);

            await storage.readAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });

        describe('otherwise it should request country data from CountriesCache', () => {
          const storage = createStorageWithCustomCountriesCacheLoggerAndKeyAccessorNoEnc();

          it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
            const country = 'hu';
            const popAPIUrl = `https://${country}.api.incountry.io`;
            const key = 'test';
            const request = { country, key };

            const popAPI = nock(popAPIUrl)
              .get(`/v2/storage/records/${country}/${key}`)
              .reply(200, popAPIResponse);

            await storage.readAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });

          it('should use the default endpoint otherwise', async () => {
            const country = 'ae';
            const key = 'test';
            const request = { country, key };

            const popAPI = nock(POPAPI_URL)
              .get(`/v2/storage/records/${country}/${key}`)
              .reply(200, popAPIResponse);

            await storage.readAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          it('should encrypt payload', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await storage._encryptPayload(recordData);
            nock(POPAPI_URL)
              .get(`/v2/storage/records/${COUNTRY}/${encryptedPayload.key}`)
              .reply(200, encryptedPayload);

            const { record } = await storage.readAsync(_.pick(recordData, ['country', 'key']));
            const expected = _.pick(recordData, ['key', 'body']);
            expect(record).to.deep.include(expected);
          });
        });

        describe('when disabled', () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

          it.skip('should encrypt payload', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await storage._encryptPayload(recordData);
            nock(POPAPI_URL)
              .get(`/v2/storage/records/${COUNTRY}/${encryptedPayload.key}`)
              .reply(200, encryptedPayload);

            const { record } = await storage.readAsync(_.pick(recordData, ['country', 'key']));
            const expected = _.pick(recordData, ['key', 'body']);
            expect(record).to.deep.include(expected);
          });
        });
      });
    });

    describe('deleteAsync', () => {
      const popAPIResponse = { success: true };

      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();
        });

        describe('when the request has no country field', () => {
          it('should throw an error and log it', async () => {
            const request = {};
            await expect(storage.deleteAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error and log it', async () => {
            const request = { country: '123' };
            await expect(storage.deleteAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe.skip('POPAPI endpoint', () => {
        describe('if the endpoint was set during storage creation', () => {
          const storage = createStorageWithCustomEndpointLoggerAndKeyAccessorNoEnc();

          it('should use the provided endpoint', async () => {
            const key = 'test';
            const request = { country: COUNTRY, key };
            const encryptedPayload = await storage._encryptPayload(request);

            const popAPI = nock(customStorageEndpoint)
              .delete(`/v2/storage/records/${COUNTRY}/${encryptedPayload.key}`)
              .reply(200, popAPIResponse);

            await storage.deleteAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });

        describe('otherwise it should request country data from CountriesCache', () => {
          const storage = createStorageWithCustomCountriesCacheLoggerAndKeyAccessorNoEnc();

          it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
            const country = 'hu';
            const popAPIUrl = `https://${country}.api.incountry.io`;
            const key = 'test';
            const request = { country, key };

            const popAPI = nock(popAPIUrl)
              .delete(`/v2/storage/records/${country}/${key}`)
              .reply(200, popAPIResponse);

            await storage.deleteAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });

          it('should use the default endpoint otherwise', async () => {
            const country = 'ae';
            const key = 'test';
            const request = { country, key };

            const popAPI = nock(POPAPI_URL)
              .delete(`/v2/storage/records/${country}/${key}`)
              .reply(200, popAPIResponse);

            await storage.deleteAsync(request);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });
      });

      describe('encryption', () => {
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

        it('should hash key', async () => {
          const record = { country: COUNTRY, key: 'test' };
          const encryptedKey = storage.createKeyHash(record.key);
          const popAPI = nock(POPAPI_URL)
            .delete(`/v2/storage/records/${COUNTRY}/${encryptedKey}`)
            .reply(200, popAPIResponse);

          await storage.deleteAsync(record);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });
      });
    });

    describe('find', () => {
      const popAPIResponse = { success: true };

      describe('should validate arguments', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();
        });

        describe('when country is not a string', () => {
          it('should log error', async () => {
            try {
              await storage.find();
            } catch (e) {
              expect(loggerSpy.calledWith('error')).to.equal(true);
              return;
            }
            chai.assert.fail('Validation passed');
          });

          it('should throw an error', async () => {
            await expect(storage.find()).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find(null)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find(1)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find({})).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find([])).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when options.limit is not positive integer or greater than MAX_LIMIT', () => {
          it('should log error', async () => {
            try {
              await storage.find('test', undefined, { limit: -1 });
            } catch (e) {
              expect(loggerSpy.calledWith('error')).to.equal(true);
              return;
            }
            chai.assert.fail('Validation passed');
          });

          it('should throw an error', async () => {
            await expect(storage.find('test', undefined, { limit: -1 }))
              .to.be.rejectedWith(Error, 'Limit should be a positive integer');
            await expect(storage.find('test', undefined, { limit: Storage.MAX_LIMIT + 1 }))
              .to.be.rejectedWith(Error, `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`);
          });
        });
      });

      describe.skip('POPAPI endpoint', () => {
        describe('if the endpoint was set during storage creation', () => {
          const storage = createStorageWithCustomEndpointLoggerAndKeyAccessorNoEnc();

          it('should use the provided endpoint', async () => {
            const popAPI = nock(customStorageEndpoint)
              .post(`/v2/storage/records/${COUNTRY}/find`)
              .reply(200, popAPIResponse);

            await storage.find(COUNTRY, {});
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });

        describe('otherwise it should request country data from CountriesCache', () => {
          const storage = createStorageWithCustomCountriesCacheLoggerAndKeyAccessorNoEnc();

          it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
            const country = 'hu';
            const popAPIUrl = `https://${country}.api.incountry.io`;
            const popAPIFindResponse = {
              data: [],
              meta: {},
            }

            const popAPI = nock(popAPIUrl)
              .post(`/v2/storage/records/${country}/find`)
              .reply(200, popAPIFindResponse);

            await storage.find(country, {});
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });

          it('should use the default endpoint otherwise', async () => {
            const country = 'ae';
            const popAPIFindResponse = {
              data: [],
              meta: {},
            }

            const popAPI = nock(POPAPI_URL)
              .post(`/v2/storage/records/${country}/find`)
              .reply(200, popAPIFindResponse);

            await storage.find(country, {});
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });
      });

      describe('encryption', () => {

        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

        it('should hash filters', (done) => {
          const filter = { key: [uuid(), uuid()] };
          const hashedFilter = { key: filter.key.map((el) => storage.createKeyHash(el)) };

          const popAPI = nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/find`)
            .reply(200);

          popAPI.on('request', (req, interceptor, body) => {
            const bodyObj = JSON.parse(body);
            expect(bodyObj.filter).to.deep.equal(hashedFilter);
            done();
          });

          storage.find(COUNTRY, filter);
        });
      });
    });

    describe('findOne', () => {
      describe('when no results found', () => {
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

        it('should return null', async () => {
          nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/find`)
            .reply(200);

          const result = await storage.findOne(COUNTRY, {});
          expect(result.record).to.equal(null);
        });
      });
    });

    describe('updateOne', () => {
      const popAPIResponse = { success: true };

      describe('should validate arguments', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();
        });

        describe('when country is not a string', () => {
          it('should log error', async () => {
            try {
              await storage.updateOne();
            } catch (e) {
              expect(loggerSpy.calledWith('error')).to.equal(true);
              return;
            }
            chai.assert.fail('Validation passed');
          });

          it('should throw an error', async () => {
            await expect(storage.updateOne()).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.updateOne(null)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.updateOne(1)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.updateOne({})).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.updateOne([])).to.be.rejectedWith(Error, 'Missing country');
          });
        });
      });

      describe('when override enabled', () => {
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

        it.skip('should simply write record', (done) => {
          const request = {
            country: COUNTRY,
            key: uuid(),
            version: 0,
            body: 'test',
          };

          const popAPI = nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}`)
            .reply(200, popAPIResponse);

          popAPI.on('request', async (req, interceptor, reqBody) => {
            const bodyObj = JSON.parse(reqBody);
            expect(bodyObj.body).to.equal(request.body);
            done();
          });

          storage.updateOne(COUNTRY, {}, request, { override: true });
        });
      });
    });

    describe('migrate', () => {
      describe('when encryption disabled', () => {
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

        it('should throw an error', async () => {
          await expect(storage.migrate(COUNTRY, 10)).to.be.rejectedWith(Error, 'Migration not supported when encryption is off');
        });
      });
    });

    describe('batchWrite', () => {
      const popAPIResponse = { success: true };

      describe('should validate records', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();

          nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/batchWrite`)
            .reply(200);
        });

        describe('when the records is empty array', () => {
          it('should throw an error', async () => {
            await expect(storage.batchWrite(COUNTRY, [])).to.be.rejectedWith(Error, 'You must pass non-empty array');
          });
        });

        describe('when the record has no country field', () => {
          it('should throw an error', async () => {
            await expect(storage.batchWrite(COUNTRY, [{}])).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the record has no key field', () => {
          it('should throw an error', async () => {
            await expect(storage.batchWrite(COUNTRY, [{ country: COUNTRY }])).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe.skip('POPAPI endpoint', () => {
        describe('if the endpoint was set during storage creation', () => {
          const storage = new Storage({
            apiKey: 'string',
            environmentId: 'string',
            endpoint: customStorageEndpoint,
          }, new SecretKeyAccessor(() => SECRET_KEY), logger);

          it('should use the provided endpoint', async () => {
            const popAPI = nock(customStorageEndpoint)
              .post(`/v2/storage/records/${COUNTRY}/batchWrite`)
              .reply(200, popAPIResponse);

            await storage.batchWrite(COUNTRY, TEST_RECORDS);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });

        describe('otherwise it should request country data from CountriesCache', () => {
          const storage = new Storage({
            apiKey: 'string',
            environmentId: 'string',
          }, new SecretKeyAccessor(() => SECRET_KEY), logger, countriesCache);

          it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
            const country = 'hu';
            const popAPIUrl = `https://${country}.api.incountry.io`;

            const popAPI = nock(popAPIUrl)
              .post(`/v2/storage/records/${country}/batchWrite`)
              .reply(200, popAPIResponse);

            await storage.batchWrite(country, TEST_RECORDS);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });

          it('should use the default endpoint otherwise', async () => {
            const country = 'ae';

            const popAPI = nock(POPAPI_URL)
              .post(`/v2/storage/records/${country}/batchWrite`)
              .reply(200, popAPIResponse);

            await storage.batchWrite(country, TEST_RECORDS);
            assert.equal(popAPI.isDone(), true, 'nock is done');
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error and log it', async () => {
          const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          const scope = nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/batchWrite`)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(storage.batchWrite(COUNTRY, TEST_RECORDS)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });
  });

  describe('should work correctly', function () {
    /** @type {import('../../storage')} */
    let storage;
    beforeEach(function () {
      storage = new Storage({
        apiKey: 'string',
        environmentId: 'string',
        endpoint: POPAPI_URL,
      },
        new SecretKeyAccessor(() => SECRET_KEY)
      )
    });
    TEST_RECORDS.forEach((testCase, idx) => {
      context(`with test case ${idx}`, function () {
        it('should write a record', function (done) {
          const scope = nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}`)
            .reply(200);
          storage.writeAsync(testCase);
          scope.on('request', async function (req, interceptor, body) {
            try {
              const encrypted = await storage._encryptPayload(testCase)
              const bodyObj = JSON.parse(body);
              expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
              done();
            } catch (e) {
              done(e)
            }
          });
        });
        it('should read a record', async function () {
          const encrypted = await storage._encryptPayload(testCase);
          nock(POPAPI_URL)
            .get(`/v2/storage/records/${COUNTRY}/${encrypted.key}`)
            .reply(200, encrypted);
          const { record } = await storage.readAsync(testCase);
          const expected = _.pick(testCase, ['key', 'body']);
          expect(record).to.deep.include(expected);
        })
        it('should delete a record', function (done) {
          storage._encryptPayload(testCase).then((encrypted) => {
            const scope = nock(POPAPI_URL)
              .delete(`/v2/storage/records/${COUNTRY}/${encrypted.key}`)
              .reply(200);
            storage.deleteAsync(testCase)
            scope.on('error', done);
            scope.on('request', () => done())
          }).catch(done);
        })
      })
    });

    it('should batch write', function (done) {
      const scope = nock(POPAPI_URL)
        .post(`/v2/storage/records/${COUNTRY}/batchWrite`)
        .reply(200);
      storage.batchWrite('us', TEST_RECORDS);
      scope.on('request', function (req, interceptor, body) {
        const bodyObj = JSON.parse(body);
        bodyObj.records.forEach((encRecord, index) => {
          const testRecord = TEST_RECORDS[index];
          expect(encRecord).to.include.all.keys(Object.keys(testRecord));
          expect(encRecord).not.to.deep.equal(testRecord);
        });

        done();
      });
    });

    it('should migrate data from old secret to new', async function () {
      this.timeout(3000);

      const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)));

      const oldSecret = { secret: SECRET_KEY, version: 0 };
      const newSecret = { secret: 'newnew', version: 1 };
      storage.setSecretKeyAccessor(new SecretKeyAccessor(() => ({
        secrets: [oldSecret, newSecret],
        currentVersion: newSecret.version,
      })));

      nock(POPAPI_URL)
        .post(`/v2/storage/records/${COUNTRY}/find`)
        .reply(200, () => ({
          meta: {
            total: encryptedRecords.length,
            count: encryptedRecords.length,
          },
          data: encryptedRecords,
        }));

      nock(POPAPI_URL)
        .post(`/v2/storage/records/${COUNTRY}/batchWrite`)
        .reply(200, (uri, body) => {
          expect(body.records.length).to.equal(encryptedRecords.length);
          body.records.forEach((rec, index) => {
            expect(_.omit(rec, ['body', 'version'])).to.deep.equal(_.omit(encryptedRecords[index], ['body', 'version']));
            expect(rec.body).to.not.equal(encryptedRecords[index].body);
            expect(rec.version).to.not.equal(encryptedRecords[index].version);
          });
        });

      const result = await storage.migrate(COUNTRY, TEST_RECORDS.length);
      expect(result.meta.totalLeft).to.equal(0);
      expect(result.meta.migrated).to.equal(TEST_RECORDS.length);
    });

    it.skip('should find by random key', async function () {
      const filter = { profile_key: TEST_RECORDS[4].profile_key }
      const options = { limit: 1, offset: 1 }
      const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)))
      nock(POPAPI_URL)
        .post(`/v2/storage/records/${COUNTRY}/find`)
        .reply(200, (uri, requestBody) => {
          const filterKeys = Object.keys(requestBody.filter);
          const records = encryptedRecords.filter((rec) => {
            for (let i = 0; i < filterKeys.length; i += 1) {
              if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
                return false
              }
            }
            return true
          })
          return { meta: { total: records.length }, data: records }
        });
      const result = await storage.find('us', filter, options);
      expect(result.records.length).to.eql(2);
    })
    it('should return error when find limit option is not positive integer', async function () {
      await expect(storage.find('us', {}, { limit: -123 })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find('us', {}, { limit: 123.124 })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find('us', {}, { limit: 'sdsd' })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find('us', {}, { limit: 10 })).not.to.be.rejectedWith(Error, 'Limit should be a positive integer');
    })
    it('should findOne by random key', async function () {
      const filter = { key3: TEST_RECORDS[4].key3 }
      const options = { limit: 1, offset: 1 }
      const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)))
      nock(POPAPI_URL)
        .post(`/v2/storage/records/${COUNTRY}/find`)
        .reply(200, (uri, requestBody) => {
          const filterKeys = Object.keys(requestBody.filter);
          const records = encryptedRecords.filter((rec) => {
            for (let i = 0; i < filterKeys.length; i += 1) {
              if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
                return false
              }
            }
            return true
          })
          return { meta: { total: records.length }, data: records }
        });
      const result = await storage.findOne('us', filter, options)
      expect(result.record).to.eql(TEST_RECORDS[4])
    })
    it('should find encrypted records', async function () {
      const encryptedStorage = new Storage({
        apiKey: 'string',
        environmentId: 'string',
        encrypt: true,
      },
        new SecretKeyAccessor(() => SECRET_KEY)
      );

      const storedData = await Promise.all(
        TEST_RECORDS.map((record) => encryptedStorage._encryptPayload(record))
      );

      nock('https://us.api.incountry.io')
        .post(`/v2/storage/records/us/find`)
        .reply(200, (uri, requestBody) => {
          return { meta: { total: storedData.length }, data: storedData };
        });

      const { records } = await encryptedStorage.find('us', { 'key': 'key1' });

      records.forEach((record, idx) => {
        ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
          if (record[key]) {
            expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
          }
        });
      });
    });
    it('should find not encrypted records', async function () {
      const notEncryptedStorage = new Storage({
        apiKey: 'string',
        environmentId: 'string',
        encrypt: false,
      });
      const storedData = await Promise.all(
        TEST_RECORDS.map((record) => notEncryptedStorage._encryptPayload(record))
      );

      nock('https://us.api.incountry.io')
        .post(`/v2/storage/records/us/find`)
        .reply(200, (uri, requestBody) => {
          return { meta: { total: storedData.length }, data: storedData };
        });

      const { records } = await notEncryptedStorage.find('us', { 'key': 'key1' });

      return records.forEach((record, idx) => {
        ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
          if (record[key]) {
            expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
          }
        });
      });
    });
    it('should update one by profile key', function (done) {
      const payload = { profile_key: 'updatedProfileKey' }
      storage._encryptPayload(TEST_RECORDS[4]).then((encrypted) => {
        nock(POPAPI_URL)
          .post(`/v2/storage/records/${COUNTRY}/find`)
          .reply(200, { data: [encrypted], meta: { total: 1 } });
        const writeNock = nock(POPAPI_URL)
          .post(`/v2/storage/records/${COUNTRY}`)
          .reply(200, { data: [encrypted], meta: { total: 1 } });
        writeNock.on('request', (req, interceptor, body) => {
          const expectedPlain = {
            ...TEST_RECORDS[4],
            ...payload,
          }
          storage._decryptPayload(JSON.parse(body)).then((decrypted) => {
            try {
              expect(decrypted).to.eql(expectedPlain)
              done()
            } catch (e) {
              done(e)
            }
          })
        })
        storage.updateOne('us', { profileKey: TEST_RECORDS[4].profileKey }, payload)
      })
    })
    context('exceptions', function () {
      context('updateOne', function () {
        it('should reject if too many records found', function (done) {
          nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/find`)
            .reply(200, { data: [], meta: { total: 2 } });
          storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done())
        })
        it('should reject if no records found', function (done) {
          nock(POPAPI_URL)
            .post(`/v2/storage/records/${COUNTRY}/find`)
            .reply(200, { data: [], meta: { total: 0 } });
          storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done())
        })
      })
      context('delete', function () {
        it('should throw when invalid url', function (done) {
          const INVALID_KEY = 'invalid';
          nock(POPAPI_URL)
            .delete(`/v2/storage/records/${COUNTRY}/${storage.createKeyHash(INVALID_KEY)}`)
            .reply(404);
          storage.deleteAsync({ country: 'us', key: INVALID_KEY }).then(() => done('should be rejected')).catch(() => done())
        })
      })
      context('read', async function () {
        it('should return error when not found', async function () {
          const INVALID_KEY = 'invalid';
          const scope = nock(POPAPI_URL)
            .get(`/v2/storage/records/${COUNTRY}/${storage.createKeyHash(INVALID_KEY)}`)
            .reply(404);

          await expect(storage.readAsync({ country: 'us', key: INVALID_KEY })).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        })
        it('should return error when server error', async function () {
          const INVALID_KEY = 'invalid';
          const scope = nock(POPAPI_URL)
            .get(`/v2/storage/records/${COUNTRY}/${storage.createKeyHash(INVALID_KEY)}`)
            .reply(500);

          await expect(storage.readAsync({ country: 'us', key: INVALID_KEY })).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        })
      })
    })
  });
});
