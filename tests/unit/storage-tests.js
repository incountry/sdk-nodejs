/* eslint-disable */
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
    const logger = { write: (a, b) => [a, b] };
    const createDefaultStorageWithLogger = () => new Storage({ apiKey: 'string', environmentId: 'string' }, undefined, logger);

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

      it('should throw an error if called without arguments', () => {
        expect(() => storage.setLogger()).to.throw(Error, 'Please specify a logger');
      });

      it('should throw an error if called with falsy argument', () => {
        expect(() => storage.setLogger(null)).to.throw(Error, 'Please specify a logger');
        expect(() => storage.setLogger(undefined)).to.throw(Error, 'Please specify a logger');
        expect(() => storage.setLogger(false)).to.throw(Error, 'Please specify a logger');
      });

      it('should throw an error if provided logger is not object or has no "write" method or is not a function', () => {
        const expectSetLoggerThrowsError = (wrongLogger) => {
          expect(() => storage.setLogger(wrongLogger))
            .to.throw(Error, 'Logger must implement write function');
        };

        const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
        wrongLoggers.map((item) => expectSetLoggerThrowsError(item));
      });

      it('should throw an error if provided logger.write is a function with less than 2 arguments', () => {
        const expectSetLoggerThrowsError = (wrongLogger) => {
          expect(() => storage.setLogger(wrongLogger))
            .to.throw(Error, 'Logger.write must have at least 2 parameters');
        };

        const expectSetLoggerNotThrowsError = (correctLogger) => {
          expect(() => storage.setLogger(correctLogger)).not.to.throw();
        };

        const wrongLoggers = [{ write: () => null }, { write: (a) => a }];
        wrongLoggers.map((item) => expectSetLoggerThrowsError(item));

        const correctLoggers = [{ write: (a, b) => [a, b] }, { write: (a, b, c) => [a, b, c] }];
        correctLoggers.map((item) => expectSetLoggerNotThrowsError(item));
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
          expect(() => storage.setSecretKeyAccessor(arg)).to.throw(Error, 'You must pass an instance of SecretKeyAccessor');
        };
        expectSetSecretKeyAccessorThrowsError();
        expectSetSecretKeyAccessorThrowsError(null);
        expectSetSecretKeyAccessorThrowsError(undefined);
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
      describe('should validate request', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();

          nockPOPAPIEndpoint(POPAPI_URL, 'write', COUNTRY).reply(200);
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
          storage = createDefaultStorageWithLogger();
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

          it('should encrypt payload', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await storage._encryptPayload(recordData);
            nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
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
            nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
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
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

        it('should hash key', async () => {
          const record = { country: COUNTRY, key: 'test' };
          const encryptedKey = storage.createKeyHash(record.key);
          const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, encryptedKey)
            .reply(200, popAPIResponse);

          await storage.deleteAsync(record);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });
      });
    });

    describe('find', () => {
      describe('should validate arguments', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();
        });

        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            await expect(storage.find()).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find(null)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find(1)).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find({})).to.be.rejectedWith(Error, 'Missing country');
            await expect(storage.find([])).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when options.limit is not positive integer or greater than MAX_LIMIT', () => {
          it('should throw an error', async () => {
            await expect(storage.find('test', undefined, { limit: -1 }))
              .to.be.rejectedWith(Error, 'Limit should be a positive integer');
            await expect(storage.find('test', undefined, { limit: Storage.MAX_LIMIT + 1 }))
              .to.be.rejectedWith(Error, `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`);
          });
        });
      });

      describe('encryption', () => {
        const storage = createStorageWithPOPAPIEndpointLoggerAndKeyAccessor();

        it('should hash filters', (done) => {
          const filter = { key: [uuid(), uuid()] };
          const hashedFilter = { key: filter.key.map((el) => storage.createKeyHash(el)) };

          const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200);

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
          nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200);

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

          const popAPI = nockPOPAPIEndpoint(POPAPI_URL, 'update', COUNTRY)
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
      describe('should validate records', () => {
        let storage;
        beforeEach(() => {
          storage = createDefaultStorageWithLogger();

          nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);
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
    const logger = { write: (a, b) => [a, b] };
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
        return new Storage(options, new SecretKeyAccessor(() => SECRET_KEY), logger, cache);
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
        it('should read a record', async function () {
          const encrypted = await storage._encryptPayload(testCase);
          nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, encrypted.key)
            .reply(200, encrypted);
          const { record } = await storage.readAsync(testCase);
          const expected = _.pick(testCase, ['key', 'body']);
          expect(record).to.deep.include(expected);
        })
        it('should delete a record', function (done) {
          storage._encryptPayload(testCase).then((encrypted) => {
            const scope = nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, encrypted.key).reply(200);
            storage.deleteAsync(testCase)
            scope.on('error', done);
            scope.on('request', () => done())
          }).catch(done);
        })
      })
    });

    it('should batch write', function (done) {
      const scope = nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);
      storage.batchWrite(COUNTRY, TEST_RECORDS);
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

      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
        .reply(200, () => ({
          meta: {
            total: encryptedRecords.length,
            count: encryptedRecords.length,
          },
          data: encryptedRecords,
        }));

      nockPOPAPIEndpoint(POPAPI_URL, 'batchWrite', COUNTRY)
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
      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
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
      const result = await storage.find(COUNTRY, filter, options);
      expect(result.records.length).to.eql(2);
    })
    it('should return error when find limit option is not positive integer', async function () {
      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200);
      await expect(storage.find(COUNTRY, {}, { limit: -123 })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find(COUNTRY, {}, { limit: 123.124 })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find(COUNTRY, {}, { limit: 'sdsd' })).to.be.rejectedWith(Error, 'Limit should be a positive integer');
      await expect(storage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
    })
    it('should findOne by random key', async function () {
      const filter = { key3: TEST_RECORDS[4].key3 }
      const options = { limit: 1, offset: 1 }
      const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)))
      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
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
      const result = await storage.findOne(COUNTRY, filter, options)
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

      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
        .reply(200, (uri, requestBody) => {
          return { meta: { total: storedData.length }, data: storedData };
        });

      const { records } = await encryptedStorage.find(COUNTRY, { 'key': 'key1' });

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
      },
        null
      );
      const storedData = await Promise.all(
        TEST_RECORDS.map((record) => notEncryptedStorage._encryptPayload(record))
      );

      nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
        .reply(200, (uri, requestBody) => {
          return { meta: { total: storedData.length }, data: storedData };
        });

      const { records } = await notEncryptedStorage.find(COUNTRY, { 'key': 'key1' });

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
        nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
          .reply(200, { data: [encrypted], meta: { total: 1 } });
        const writeNock = nockPOPAPIEndpoint(POPAPI_URL, 'write', COUNTRY)
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
        storage.updateOne(COUNTRY, { profileKey: TEST_RECORDS[4].profileKey }, payload)
      })
    })
    context('exceptions', function () {
      context('updateOne', function () {
        it('should reject if too many records found', function (done) {
          nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { data: [], meta: { total: 2 } });
          storage.updateOne(COUNTRY, {}, {}).then(() => done('Should reject')).catch(() => done())
        })
        it('should reject if no records found', function (done) {
          nockPOPAPIEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { data: [], meta: { total: 0 } });
          storage.updateOne(COUNTRY, {}, {}).then(() => done('Should reject')).catch(() => done())
        })
      })
      context('delete', function () {
        it('should throw when invalid url', function (done) {
          const INVALID_KEY = 'invalid';
          nockPOPAPIEndpoint(POPAPI_URL, 'delete', COUNTRY, storage.createKeyHash(INVALID_KEY))
            .reply(404);
          storage.deleteAsync({ country: COUNTRY, key: INVALID_KEY }).then(() => done('should be rejected')).catch(() => done())
        })
      })
      context('read', async function () {
        it('should return error when not found', async function () {
          const INVALID_KEY = 'invalid';
          const scope = nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, storage.createKeyHash(INVALID_KEY))
            .reply(404);

          await expect(storage.readAsync({ country: COUNTRY, key: INVALID_KEY })).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        })
        it('should return error when server error', async function () {
          const INVALID_KEY = 'invalid';
          const scope = nockPOPAPIEndpoint(POPAPI_URL, 'read', COUNTRY, storage.createKeyHash(INVALID_KEY))
            .reply(500);

          await expect(storage.readAsync({ country: COUNTRY, key: INVALID_KEY })).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        })
      })
    })
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
