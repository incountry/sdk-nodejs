const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const Storage = require('../../storage');
const { StorageServerError } = require('../../errors');
const CountriesCache = require('../../countries-cache');
const SecretKeyAccessor = require('../../secret-key-accessor');
const { getNockedRequestBodyObject, nockEndpoint, popAPIEndpoints } = require('../test-helpers/popapi-nock');

const { expect, assert } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_URL = `https://${COUNTRY}.api.incountry.io`;
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };

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

const getDefaultStorage = (encrypt) => new Storage({
  apiKey: 'string',
  environmentId: 'string',
  endpoint: POPAPI_URL,
  encrypt,
}, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB);

describe('Storage', () => {
  describe('interface methods', () => {
    let encStorage;
    let noEncStorage;

    const shouldValidateRecord = (method) => {
      describe('should validate record', () => {
        describe('when the record has no country field', () => {
          it('should throw an error', async () => {
            const record = {};
            await expect(encStorage[method](record)).to.be.rejectedWith(Error, 'Missing country');
          });
        });

        describe('when the record has no key field', () => {
          it('should throw an error', async () => {
            const record = { country: '123' };
            await expect(encStorage[method](record)).to.be.rejectedWith(Error, 'Missing key');
          });
        });
      });
    };

    beforeEach(() => {
      nock.disableNetConnect();
      encStorage = getDefaultStorage(true);
      noEncStorage = getDefaultStorage(false);
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
      let popAPI;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_URL, 'write', COUNTRY).reply(200);
      });

      shouldValidateRecord('writeAsync');

      describe('encryption', () => {
        describe('when disabled', () => {
          it('should hash keys and send body as plain text', async () => {
            const record = { country: COUNTRY, key: uuid(), body: 'test' };
            const hashedKey = await noEncStorage.createKeyHash(record.key);

            const [bodyObj, result] = await Promise.all([getNockedRequestBodyObject(popAPI), noEncStorage.writeAsync(record)]);
            expect(bodyObj.key).to.equal(hashedKey);
            expect(bodyObj.body).to.match(/^pt:.+/);
            expect(result.record).to.deep.equal(record);
          });
        });

        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should encrypt a record', async () => {
                const encrypted = await encStorage._encryptPayload(testCase);
                const [bodyObj, result] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.writeAsync(testCase)]);
                expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
                expect(bodyObj.body).to.match(/^2:.+/);
                expect(result.record).to.deep.equal(testCase);
              });
            });
          });
        });
      });
    });

    describe('readAsync', () => {
      shouldValidateRecord('readAsync');

      describe('encryption', () => {
        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await encStorage._encryptPayload(testCase);
                nockEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
                  .reply(200, encryptedPayload);

                const { record } = await encStorage.readAsync(_.pick(testCase, ['country', 'key']));
                expect(record).to.deep.equal(testCase);
              });
            });
          });
        });

        describe('when disabled', () => {
          it('should read a record', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await noEncStorage._encryptPayload(recordData);
            expect(encryptedPayload.body).to.match(/^pt:.+/);
            nockEndpoint(POPAPI_URL, 'read', COUNTRY, encryptedPayload.key)
              .reply(200, encryptedPayload);

            const { record } = await noEncStorage.readAsync(_.pick(recordData, ['country', 'key']));
            expect(record).to.deep.include(recordData);
          });
        });
      });
    });

    describe('deleteAsync', () => {
      shouldValidateRecord('deleteAsync');

      describe('encryption', () => {
        const record = { country: COUNTRY, key: 'test' };

        it('should hash key regardless of enabled/disabled encryption', async () => {
          const encryptedKey = encStorage.createKeyHash(record.key);
          const popAPI = nockEndpoint(POPAPI_URL, 'delete', COUNTRY, encryptedKey)
            .times(2)
            .reply(200);

          await encStorage.deleteAsync(record);
          await noEncStorage.deleteAsync(record);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should delete a record', async () => {
              const encryptedPayload = await encStorage._encryptPayload(testCase);
              const popAPI = nockEndpoint(POPAPI_URL, 'delete', COUNTRY, encryptedPayload.key).reply(200);

              const result = await encStorage.deleteAsync(testCase);
              expect(result).to.deep.equal({ success: true });
              assert.equal(popAPI.isDone(), true, 'nock is done');
            });
          });
        });
      });

      describe('errors handling', () => {
        const record = { country: COUNTRY, key: 'invalid' };
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

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            const scope = errCase.respond(nockEndpoint(POPAPI_URL, 'delete', COUNTRY, encStorage.createKeyHash(record.key)));

            await expect(encStorage.deleteAsync(record)).to.be.rejectedWith(StorageServerError);
            assert.equal(scope.isDone(), true, 'Nock scope is done');
          });
        });
      });
    });

    describe('find', () => {
      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.find(country))
              .to.be.rejectedWith(Error, 'Missing country')));
          });
        });

        describe('when options.limit is not positive integer or greater than MAX_LIMIT', () => {
          it('should throw an error', async () => {
            // TODO: nock portal-backend
            nockEndpoint(POPAPI_URL, 'find', COUNTRY, 'test').reply(200);

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            await Promise.all(nonPositiveLimits.map((limit) => expect(encStorage.find(COUNTRY, undefined, { limit }))
              .to.be.rejectedWith(Error, 'Limit should be a positive integer')));
            await expect(encStorage.find(COUNTRY, undefined, { limit: Storage.MAX_LIMIT + 1 }))
              .to.be.rejectedWith(Error, `Max limit is ${Storage.MAX_LIMIT}. Use offset to populate more`);
            await expect(encStorage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
          });
        });
      });

      describe('encryption', () => {
        it('should hash filters regardless of enabled/disabled encryption', async () => {
          const filter = { key: [uuid(), uuid()] };
          const hashedFilter = { key: filter.key.map((el) => encStorage.createKeyHash(el)) };

          const popAPI = nockEndpoint(POPAPI_URL, 'find', COUNTRY)
            .times(2)
            .reply(200);

          let [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), noEncStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        it('should hash profile_key in filters request and decrypt returned data correctly', async () => {
          const filter = { profile_key: TEST_RECORDS[4].profile_key };
          const hashedFilter = { profile_key: encStorage.createKeyHash(filter.profile_key) };
          let requestedFilter;

          const resultRecords = TEST_RECORDS.filter((rec) => rec.profile_key === filter.profile_key);
          const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage._encryptPayload(record)));

          nockEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, (uri, requestBody) => {
              requestedFilter = requestBody.filter;
              return { meta: { total: encryptedRecords.length }, data: encryptedRecords };
            });

          const result = await encStorage.find(COUNTRY, filter, {});
          expect(result.records).to.deep.equal(resultRecords);
          expect(requestedFilter).to.deep.equal(hashedFilter);
        });

        it('should decode not encrypted records correctly', async () => {
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage._encryptPayload(record)));

          nockEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: storedData.length }, data: storedData });

          const { records } = await noEncStorage.find(COUNTRY, { key: 'key1' });
          expect(records).to.deep.equal(TEST_RECORDS);
        });
      });
    });

    describe('findOne', () => {
      it('should return null when no results found', async () => {
        nockEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200);

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key3', async () => {
        const filter = { key3: TEST_RECORDS[4].key3 };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key3 === filter.key3);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage._encryptPayload(record)));

        nockEndpoint(POPAPI_URL, 'find', COUNTRY)
          .reply(200, { meta: { total: encryptedRecords.length }, data: encryptedRecords });
        const result = await encStorage.findOne(COUNTRY, filter);
        expect(result.record).to.deep.eql(TEST_RECORDS[4]);
      });
    });

    describe('updateOne', () => {
      const preparePOPAPI = async (record) => {
        const encryptedRecord = await encStorage._encryptPayload(record);
        const popAPIFind = nockEndpoint(POPAPI_URL, 'find', COUNTRY)
          .reply(200, { meta: { total: 1 }, data: [encryptedRecord] });
        const popAPIWrite = nockEndpoint(POPAPI_URL, 'write', COUNTRY).reply(200);
        return [popAPIFind, popAPIWrite];
      };

      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.updateOne(country))
              .to.be.rejectedWith(Error, 'Missing country')));
          });
        });
      });

      describe('when override enabled', () => {
        it('should simply write record when the key is specified', async () => {
          const record = TEST_RECORDS[1];
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await encStorage.updateOne(COUNTRY, {}, record, { override: true });
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), false, 'find() not called');
        });

        it('should find record and then write it when the key is not specified', async () => {
          const record = TEST_RECORDS[2];
          const payload = _.omit(record, 'key');
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await encStorage.updateOne(COUNTRY, payload, payload, { override: true });
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });

      describe('when override disabled', () => {
        it('should find record and then write it', async () => {
          const record = TEST_RECORDS[1];
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          await encStorage.updateOne(COUNTRY, record, record);
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should update one by profile key', async () => {
          const record = TEST_RECORDS[4];
          const filter = { profile_key: record.profile_key };
          const hashedFilter = { profile_key: encStorage.createKeyHash(filter.profile_key) };
          const [popAPIFind, popAPIWrite] = await preparePOPAPI(record);

          const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPIFind), encStorage.updateOne(COUNTRY, filter, record)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);
          assert.equal(popAPIWrite.isDone(), true, 'write() called');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });

      describe('errors handling', () => {
        it('should reject if too many records found', async () => {
          const popAPIFind = nockEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: 2 }, data: [] });
          await expect(encStorage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Multiple records found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should reject if no records found', async () => {
          const popAPIFind = nockEndpoint(POPAPI_URL, 'find', COUNTRY)
            .reply(200, { meta: { total: 0 }, data: [] });
          await expect(encStorage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Record not found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });
    });

    describe('migrate', () => {
      describe('when encryption disabled', () => {
        it('should throw an error', async () => {
          await expect(noEncStorage.migrate(COUNTRY, 10)).to.be.rejectedWith(Error, 'Migration not supported when encryption is off');
        });
      });

      describe('when encryption enabled', () => {
        it('should migrate data from old secret to new', async () => {
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage._encryptPayload(record)));
          const findResponse = { meta: { total: encryptedRecords.length, count: encryptedRecords.length }, data: encryptedRecords };
          const migrateResult = { meta: { migrated: encryptedRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };
          encStorage.setSecretKeyAccessor(new SecretKeyAccessor(() => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          })));

          const popAPIFind = nockEndpoint(POPAPI_URL, 'find', COUNTRY).reply(200, findResponse);
          const popAPIBatchWrite = nockEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);

          const result = await encStorage.migrate(COUNTRY, TEST_RECORDS.length);
          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });
    });

    describe('batchWrite', () => {
      let popAPI;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_URL, 'batchWrite', COUNTRY).reply(200);
      });

      describe('should validate records', () => {
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

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            await expect(encStorage.batchWrite(COUNTRY, errCase.arg)).to.be.rejectedWith(Error, errCase.error);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          it('should batch write encrypted records', async () => {
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.batchWrite(COUNTRY, TEST_RECORDS)]);
            const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord) => encStorage._decryptPayload(encRecord)));
            expect(decryptedRecords).to.deep.equal(TEST_RECORDS);
          });
        });

        describe('when disabled', () => {
          it('should batch write encoded records', async () => {
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), noEncStorage.batchWrite(COUNTRY, TEST_RECORDS)]);
            const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord) => noEncStorage._decryptPayload(encRecord)));
            expect(decryptedRecords).to.deep.equal(TEST_RECORDS);
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          nock.cleanAll();
          const scope = nockEndpoint(POPAPI_URL, 'batchWrite', COUNTRY)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(encStorage.batchWrite(COUNTRY, TEST_RECORDS)).to.be.rejectedWith(StorageServerError);
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
        const writePath = popAPIEndpoints.write.path(country);
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
