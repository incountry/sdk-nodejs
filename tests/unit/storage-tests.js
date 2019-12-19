const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
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
  {
    country: COUNTRY,
    key: uuid(),
    version: 0,
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    version: 0,
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    version: 0,
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'key3',
    version: 0,
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'uniqueKey3',
    profile_key: 'profile_key',
    version: 0,
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'key3',
    profile_key: 'profile_key',
    range_key: 1,
    version: 0,
  },
];

const LOGGER_STUB = { write: (a, b) => [a, b] };

const nockedEndpoints = {
  write: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}`,
  },
  read: {
    verb: 'get',
    path: (...args) => `/v2/storage/records/${args[0]}/${args[1]}`,
  },
  delete: {
    verb: 'delete',
    path: (...args) => `/v2/storage/records/${args[0]}/${args[1]}`,
  },
  find: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}/find`,
  },
  batchWrite: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}/batchWrite`,
  },
};

const getNockedRequestBodyObject = (nocked) => new Promise((resolve) => {
  nocked.on('request', (req, interceptor, reqBody) => {
    const bodyObj = JSON.parse(reqBody);
    resolve(bodyObj);
  });
});

const nockPOPAPIEndpoint = (host, method, country = undefined, key = undefined) => {
  const endpoint = nockedEndpoints[method];

  return nock(host)[endpoint.verb](endpoint.path(country, key));
};

describe('Storage', () => {
  describe('interface methods', () => {
    const createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      endpoint: POPAPI_URL,
      encrypt: false,
    }, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB);

    const createStorageWithPOPAPIEndpointLoggerAndKeyAccessor = () => new Storage({
      apiKey: 'string',
      environmentId: 'string',
      endpoint: POPAPI_URL,
    }, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB);

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
            [{}, { apiKey: undefined }].forEach((options) => {
              expect(() => new Storage(options))
                .to.throw(Error, 'Please pass apiKey in options or set INC_API_KEY env var');
            });

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
            [{ apiKey: 'apiKey' }, { apiKey: 'apiKey', environmentId: undefined }].forEach((options) => {
              expect(() => new Storage(options))
                .to.throw(Error, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
            });

            expect(() => new Storage({ apiKey: 'apiKey', environmentId: 'envId' })).not.to.throw();

            process.env.INC_ENVIRONMENT_ID = 'envId';

            expect(() => new Storage({ apiKey: 'apiKey' })).not.to.throw();
          });
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', () => {
          const expectStorageConstructorThrowsError = (wrongLogger) => {
            expect(() => new Storage(undefined, undefined, wrongLogger, undefined))
              .to.throw(Error, 'Logger must implement write function');
          };

          const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
          wrongLoggers.map((item) => expectStorageConstructorThrowsError(item));
        });

        it('should throw an error if provided logger.write is a function with less than 2 arguments', () => {
          const expectStorageConstructorThrowsError = (wrongLogger) => {
            expect(() => new Storage(undefined, undefined, wrongLogger, undefined))
              .to.throw(Error, 'Logger.write must have at least 2 parameters');
          };

          const expectStorageConstructorNotThrowsError = (correctLogger) => {
            expect(() => new Storage({
              apiKey: 'string',
              environmentId: 'string',
            }, undefined, correctLogger, undefined)).not.to.throw();
          };

          const wrongLoggers = [{ write: () => null }, { write: (a) => a }];
          wrongLoggers.map((item) => expectStorageConstructorThrowsError(item));

          const correctLoggers = [{ write: (a, b) => [a, b] }, { write: (a, b, c) => [a, b, c] }];
          correctLoggers.map((item) => expectStorageConstructorNotThrowsError(item));
        });
      });
    });

    describe('setLogger', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(() => {
        storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
      });

      it('should throw an error if called with falsy argument', () => {
        [null, undefined, false].forEach((logger) => {
          expect(() => storage.setLogger(logger)).to.throw(Error, 'Please specify a logger');
        });
      });

      it('should throw an error if provided logger is not object or has no "write" method or is not a function', () => {
        const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
        wrongLoggers.forEach((logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(Error, 'Logger must implement write function');
        });
      });

      it('should throw an error if provided logger.write is a function with less than 2 arguments', () => {
        const wrongLoggers = [{ write: () => null }, { write: (a) => a }];
        wrongLoggers.forEach((logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(Error, 'Logger.write must have at least 2 parameters');
        });

        const correctLoggers = [{ write: (a, b) => [a, b] }, { write: (a, b, c) => [a, b, c] }];
        correctLoggers.forEach((logger) => {
          expect(() => storage.setLogger(logger)).not.to.throw();
        });
      });
    });

    describe('setSecretKeyAccessor', () => {
      it('should throw an error if not instance of SecretKeyAccessor was passed as argument', () => {
        /** @type {import('../../storage')} */
        const storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
        const wrongSecretKeyAccessors = [null, undefined, false, '', {}, [], console];
        wrongSecretKeyAccessors.forEach((item) => {
          expect(() => storage.setSecretKeyAccessor(item)).to.throw(Error, 'You must pass an instance of SecretKeyAccessor');
        });
        expect(() => storage.setSecretKeyAccessor(new SecretKeyAccessor(() => null))).not.to.throw();
      });
    });

    describe('setCountriesCache', () => {
      it('should throw an error if not instance of CountriesCache was passed as argument', () => {
        /** @type {import('../../storage')} */
        const storage = new Storage({ apiKey: 'apiKey', environmentId: 'envId' });
        const wrongCountriesCaches = [null, undefined, false, {}];
        wrongCountriesCaches.forEach((item) => {
          expect(() => storage.setCountriesCache(item)).to.throw(Error, 'You must pass an instance of CountriesCache');
        });
        expect(() => storage.setCountriesCache(new CountriesCache())).not.to.throw();
      });
    });

    describe('writeAsync', () => {
      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
        });

        describe('when the request has no country field', () => {
          it('should throw an error', async () => {
            const request = {};
            await expect(storage.writeAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error', async () => {
            const request = { country: '123' };
            await expect(storage.writeAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe('encryption', () => {
        let popAPI;

        beforeEach(() => {
          popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'write', COUNTRY).reply(200);
        });

        describe('when disabled', () => {
          it('should hash keys and send body as plain text', async () => {
            const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();
            const record = { country: COUNTRY, key: uuid(), body: 'test' };
            const hashedKey = await storage.createKeyHash(record.key);

            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.writeAsync(record)]);
            expect(bodyObj.key).to.equal(hashedKey);
            expect(bodyObj.body).to.match(/^pt:.+/);
          });
        });

        describe('when enabled', () => {
          let storage;

          beforeEach(() => {
            storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          });

          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should encrypt a record', async () => {
                const encrypted = await storage._encryptPayload(testCase);
                const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.writeAsync(testCase)]);
                expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
                expect(bodyObj.body).to.match(/^2:.+/);
              });
            });
          });
        });
      });

      // TODO: check return value

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          const scope = nockPOPAPIEndpoint(POPAPI_URL, 'write', COUNTRY)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(storage.writeAsync(TEST_RECORDS[0])).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });

    describe('readAsync', () => {
      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY).reply(200);
        });

        describe('when the request has no country field', () => {
          it('should throw an error', async () => {
            const request = {};
            await expect(storage.readAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error', async () => {
            const request = { country: '123' };
            await expect(storage.readAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await storage._encryptPayload(testCase);
                nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
                  .reply(200, encryptedPayload);

                const { record } = await storage.readAsync(_.pick(testCase, ['country', 'key']));
                expect(record).to.deep.equal(testCase);
              });
            });
          });
        });

        describe('when disabled', () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();

          it('should read a record', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await storage._encryptPayload(recordData);
            expect(encryptedPayload.body).to.match(/^pt:.+/);
            nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
              .reply(200, encryptedPayload);

            const { record } = await storage.readAsync(_.pick(recordData, ['country', 'key']));
            expect(record).to.deep.include(recordData);
          });
        });
      });

      // TODO: check return value

      describe('errors handling', () => {
        let storage;
        const record = { country: COUNTRY, key: 'invalid' };
        const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
        const errorCases = [{
          name: 'when record not found',
          respond: (popAPI) => popAPI.reply(404),
        }, {
          name: 'in case of server error',
          respond: (popAPI) => popAPI.reply(500),
        }, {
          name: 'in case of network error',
          respond: (popAPI) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
        }];

        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
        });

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            const scope = errCase.respond(nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, storage.createKeyHash(record.key)));

            await expect(storage.readAsync(record)).to.be.rejectedWith(StorageServerError);
            assert.equal(scope.isDone(), true, 'Nock scope is done');
          });
        });
      });
    });

    describe('deleteAsync', () => {
      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
        });

        describe('when the request has no country field', () => {
          it('should throw an error', async () => {
            const request = {};
            await expect(storage.deleteAsync(request)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the request has no key field', () => {
          it('should throw an error', async () => {
            const request = { country: '123' };
            await expect(storage.deleteAsync(request)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });

      describe('encryption', () => {
        const record = { country: COUNTRY, key: 'test' };

        it('should hash key regardless of enabled/disabled encryption', async () => {
          const storageEnc = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          const storageNonEnc = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();
          const encryptedKey = storageEnc.createKeyHash(record.key);
          const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, encryptedKey)
            .times(2)
            .reply(200);

          await storageEnc.deleteAsync(record);
          await storageNonEnc.deleteAsync(record);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should delete a record', async () => {
              const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
              const encryptedPayload = await storage._encryptPayload(testCase);
              const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, encryptedPayload.key).reply(200);

              await storage.deleteAsync(testCase);
              assert.equal(popAPI.isDone(), true, 'nock is done');
            });
          });
        });
      });

      // TODO: check return value
      // TODO: replace with _apiClient test
      describe('errors handling', () => {
        let storage;
        const record = { country: COUNTRY, key: 'invalid' };
        const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
        const errorCases = [{
          name: 'when record not found',
          respond: (popAPI) => popAPI.reply(404),
        }, {
          name: 'in case of server error',
          respond: (popAPI) => popAPI.reply(500),
        }, {
          name: 'in case of network error',
          respond: (popAPI) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
        }];

        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
        });

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            const scope = errCase.respond(nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, storage.createKeyHash(record.key)));

            await expect(storage.deleteAsync(record)).to.be.rejectedWith(StorageServerError);
            assert.equal(scope.isDone(), true, 'Nock scope is done');
          });
        });
      });
    });

    describe('find', () => {
      describe('should validate arguments', () => {
        let storage;
        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
        });

        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(storage.find(country))
              .to.be.rejectedWith(Error, 'Missing country')));
          });
        });

        describe('when options.limit is not positive integer or greater than MAX_LIMIT', () => {
          it('should throw an error', async () => {
            // TODO: nock portal-backend
            nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY, 'test').reply(200);

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            await Promise.all(nonPositiveLimits.map((limit) => expect(storage.find(COUNTRY, undefined, { limit }))
              .to.be.rejectedWith(Error, 'Limit should be a positive integer')));
            await expect(storage.find(COUNTRY, undefined, { limit: Storage.MAX_LIMIT + 1 }))
              .to.be.rejectedWith(Error, `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`);
            await expect(storage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
          });
        });
      });

      describe('encryption', () => {
        it('should hash filters regardless of enabled/disabled encryption', async () => {
          const storageEnc = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          const storageNonEnc = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();
          const filter = { key: [uuid(), uuid()] };
          const hashedFilter = { key: filter.key.map((el) => storageEnc.createKeyHash(el)) };

          const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .times(2)
            .reply(200);

          let [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storageEnc.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storageNonEnc.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        it('should hash profile_key in filters request and decrypt returned data correctly', async () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          const filter = { profile_key: TEST_RECORDS[4].profile_key };
          const hashedFilter = { profile_key: storage.createKeyHash(filter.profile_key) };
          let requestedFilter;

          const resultRecords = TEST_RECORDS.filter((rec) => rec.profile_key === filter.profile_key);
          const encryptedRecords = await Promise.all(resultRecords.map((record) => storage._encryptPayload(record)));

          nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, (uri, requestBody) => {
              requestedFilter = requestBody.filter;
              return { meta: { total: encryptedRecords.length }, data: encryptedRecords };
            });

          const result = await storage.find(COUNTRY, filter, {});
          expect(result.records).to.deep.equal(resultRecords);
          expect(requestedFilter).to.deep.equal(hashedFilter);
        });

        it('should decode not encrypted records correctly', async () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();
          const storedData = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)));

          nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: storedData.length }, data: storedData });

          const { records } = await storage.find(COUNTRY, { key: 'key1' });
          expect(records).to.deep.equal(TEST_RECORDS);
        });
      });
    });

    // TODO: request -> record

    describe('findOne', () => {
      let storage;

      beforeEach(() => {
        storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
      });

      it('should return null when no results found', async () => {
        nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200);

        const result = await storage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key3', async () => {
        const filter = { key3: TEST_RECORDS[4].key3 };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key3 === filter.key3);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => storage._encryptPayload(record)));

        nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
          .reply(200, { meta: { total: encryptedRecords.length }, data: encryptedRecords });
        const result = await storage.findOne(COUNTRY, filter);
        expect(result.record).to.deep.eql(TEST_RECORDS[4]);
      });
    });

    describe('updateOne', () => {
      let storage;
      beforeEach(() => {
        storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
      });

      const preparePOPAPI = async (record) => {
        const encryptedRecord = await storage._encryptPayload(record);
        const popAPIFind = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
          .reply(200, { meta: { total: 1 }, data: [encryptedRecord] });
        const popAPIWrite = nockPOPAPIEndpoint(POPAPI_URL, 'write', COUNTRY).reply(200);
        return [popAPIFind, popAPIWrite];
      };

      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(storage.updateOne(country))
              .to.be.rejectedWith(Error, 'Missing country')));
          });
        });
      });

      describe('when override enabled', () => {
        it('should simply write record when the key is specified', async () => {
          const record = TEST_RECORDS[1];
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await storage.updateOne(COUNTRY, {}, record, { override: true });
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), false, 'find() not called');
        });

        it('should find record and then write it when the key is not specified', async () => {
          const record = TEST_RECORDS[2];
          const payload = _.omit(record, 'key');
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await storage.updateOne(COUNTRY, payload, payload, { override: true });
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });

      describe('when override disabled', () => {
        it('should find record and then write it', async () => {
          const record = TEST_RECORDS[1];
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await storage.updateOne(COUNTRY, record, record);
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should update one by profile key', async () => {
          const record = TEST_RECORDS[4];
          const filter = { profile_key: record.profile_key };
          const hashedFilter = { profile_key: storage.createKeyHash(filter.profile_key) };
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPIFind), storage.updateOne(COUNTRY, filter, record)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });

      describe('errors handling', () => {
        it('should reject if too many records found', async () => {
          const popAPIFind = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: 2 }, data: [] });
          await expect(storage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Multiple records found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should reject if no records found', async () => {
          const popAPIFind = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: 0 }, data: [] });
          await expect(storage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Record not found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
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

      describe('when encryption enabled', () => {
        it('should migrate data from old secret to new', async () => {
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)));
          const findResponse = { meta: { total: encryptedRecords.length, count: encryptedRecords.length }, data: encryptedRecords };
          const migrateResult = { meta: { migrated: encryptedRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };
          storage.setSecretKeyAccessor(new SecretKeyAccessor(() => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          })));

          const popAPIFind = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200, findResponse);
          const popAPIBatchWrite = nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);

          const result = await storage.migrate(COUNTRY, TEST_RECORDS.length);
          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });
    });

    describe('batchWrite', () => {
      describe('should validate records', () => {
        let storage;
        const errorCases = [{
          name: 'when the records is empty array',
          arg: [],
          error: 'You must pass non-empty array',
        }, {
          name: 'when the record has no country field',
          arg: [{}],
          error: 'Missing country',
        }, {
          name: 'when the record has no key field',
          arg: [{ country: COUNTRY }],
          error: 'Missing key',
        }];

        beforeEach(() => {
          storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
          nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);
        });

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            await expect(storage.batchWrite(COUNTRY, errCase.arg)).to.be.rejectedWith(Error, errCase.error);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          it('should batch write encrypted records', async () => {
            const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();
            const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);

            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
            const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord) => storage._decryptPayload(encRecord)));
            expect(decryptedRecords).to.deep.equal(TEST_RECORDS);
          });
        });

        describe('when disabled', () => {
          it('should batch write encoded records', async () => {
            const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessorNoEnc();
            const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);

            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
            const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord) => storage._decryptPayload(encRecord)));
            expect(decryptedRecords).to.deep.equal(TEST_RECORDS);
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
          const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

          const scope = nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(storage.batchWrite(COUNTRY, TEST_RECORDS)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });
  });

  describe('helper methods', () => {
    const customStorageEndpoint = 'https://test.example';
    const portalBackendHost = 'portal-backend.incountry.com';
    const portalBackendPath = '/countries';
    const countriesCache = {
      getCountriesAsync: async () => [
        { id: 'BE', name: 'Belgium', direct: true },
        { id: 'HU', name: 'Hungary', direct: true },
      ],
    };

    beforeEach(() => {
      nock.disableNetConnect();
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('_getEndpointAsync', () => {
      let nockPB;
      const getStorage = (endpoint = undefined, cache = undefined) => {
        const options = {
          apiKey: 'string',
          environmentId: 'string',
          endpoint,
        };
        return new Storage(options, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB, cache);
      };

      const expectCorrectURLReturned = async (storage, country, host) => {
        const writePath = nockedEndpoints.write.path(country);
        const result = await storage._getEndpointAsync(country, writePath.replace(/^\//, ''));
        assert.equal(nockPB.isDone(), false, 'PB was not called');
        expect(result).to.equal(`${host}${writePath}`);
      };

      beforeEach(() => {
        nockPB = nock(portalBackendHost).get(portalBackendPath).reply(400);
      });

      describe('if the endpoint was set during storage creation', () => {
        it('should use the provided endpoint', async () => {
          const storage = getStorage(customStorageEndpoint);
          await expectCorrectURLReturned(storage, COUNTRY, customStorageEndpoint);
        });
      });

      describe('otherwise it should request country data from CountriesCache', () => {
        let storage;
        beforeEach(() => {
          storage = getStorage(undefined, countriesCache);
        });

        it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
          const country = 'hu';
          const customPOPAPIHost = `https://${country}.api.incountry.io`;
          await expectCorrectURLReturned(storage, country, customPOPAPIHost);
        });

        it('should use the default endpoint otherwise', async () => {
          const country = 'ae';
          await expectCorrectURLReturned(storage, country, POPAPI_URL);
        });
      });

      describe('when CountriesCache threw an error', () => {
        it('should use the default host', async () => {
          const failingCache = {
            getCountriesAsync: () => {
              throw new Error('test');
            },
          };
          const storage = getStorage(undefined, failingCache);

          const country = 'ae';
          await expectCorrectURLReturned(storage, country, POPAPI_URL);
        });
      });
    });
  });

  describe('should set correct headers for requests', function () {
    /** @type {import('../../storage')} */
    let storage;

    const testCase = { "country": COUNTRY, "key": uuid(), version: 0 };
    const sdkVersionRegExp = /^SDK-Node\.js\/\d+\.\d+\.\d+/

    beforeEach(function () {
      storage = new Storage({
        apiKey: 'string',
        environmentId: 'string',
        endpoint: POPAPI_URL,
      },
        new SecretKeyAccessor(() => SECRET_KEY)
      )
    });

    context('write', function () {
      it('should set User-Agent', function (done) {
        const scope = nock(POPAPI_URL)
          .post(`/v2/storage/records/${COUNTRY}`)
          .reply(200);
        storage.writeAsync(testCase);
        scope.on('request', async function (req, interceptor, body) {
          const userAgent = req.headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
          done();
        });
      });
    })
    context('read', function () {
      it('should set User-Agent', async function () {
        const encrypted = await storage._encryptPayload(testCase);
        const scope = nock(POPAPI_URL)
          .get(`/v2/storage/records/${COUNTRY}/${encrypted.key}`)
          .reply(200, encrypted);
        const { record } = await storage.readAsync(testCase);
        scope.on('request', async function (req, interceptor, body) {
          const userAgent = req.headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
          done();
        });
      })
    })
    context('delete', function () {
      it('should set User-Agent', function (done) {
        storage._encryptPayload(testCase).then((encrypted) => {
          const scope = nock(POPAPI_URL)
            .delete(`/v2/storage/records/${COUNTRY}/${encrypted.key}`)
            .reply(200);
          storage.deleteAsync(testCase)
          scope.on('request', async function (req, interceptor, body) {
            const userAgent = req.headers['user-agent'];
            expect(userAgent).to.match(sdkVersionRegExp);
            done();
          });
        }).catch(done);
      })
    })
   
  });
});
