const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const Storage = require('../../storage');
const { StorageServerError } = require('../../errors');
const CountriesCache = require('../../countries-cache');
const SecretKeyAccessor = require('../../secret-key-accessor');
const {
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
  nockEndpoint,
  popAPIEndpoints,
} = require('../test-helpers/popapi-nock');
const { COUNTRY_CODE_ERROR_MESSAGE } = require('../../validation/country-code');
const { RECORD_KEY_ERROR_MESSAGE } = require('../../validation/record-key');
const { MAX_LIMIT, LIMIT_ERROR_MESSAGE_INT, LIMIT_ERROR_MESSAGE_MAX } = require('../../validation/limit');

const { expect, assert } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const CUSTOM_STORAGE_ENDPOINT = 'https://test.example';
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
const sdkVersionRegExp = /^SDK-Node\.js\/\d+\.\d+\.\d+/;

const TEST_RECORDS = [
  {
    key: uuid(),
    version: 0,
  },
  {
    key: uuid(),
    body: 'test',
    version: 0,
  },
  {
    key: uuid(),
    body: 'test',
    key2: 'key2',
    version: 0,
  },
  {
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'key3',
    version: 0,
  },
  {
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'uniqueKey3',
    profile_key: 'profile_key',
    version: 0,
  },
  {
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
  endpoint: POPAPI_HOST,
  encrypt,
}, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB);

function createFakeCountriesCache(countries) {
  const countriesCache = new CountriesCache();
  countriesCache.getCountriesAsync = async () => countries;
  return countriesCache;
}

describe('Storage', () => {
  describe('interface methods', () => {
    /** @type {import('../../storage')} */
    let encStorage;
    /** @type {import('../../storage')} */
    let noEncStorage;

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
        const wrongSecretKeyAccessors = [null, false, '', {}, [], console];
        wrongSecretKeyAccessors.forEach((item) => {
          expect(() => storage.setSecretKeyAccessor(item)).to.throw(Error, 'secretKeyAccessor must be an instance of SecretKeyAccessor');
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

    describe('write', () => {
      let popAPI;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_HOST, 'write', COUNTRY).reply(200, 'OK');
      });

      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.write(undefined, {})).to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when the record has no key field', () => {
          it('should throw an error', async () => {
            await expect(encStorage.write(COUNTRY, {})).to.be.rejectedWith(Error, 'Invalid value');
          });
        });
      });

      describe('encryption', () => {
        const encryptionOptions = [{
          status: 'disabled',
          encrypted: false,
          bodyRegExp: /^pt:.+/,
          bodyDescr: 'body as base64',
        }, {
          status: 'enabled',
          encrypted: true,
          bodyRegExp: /^2:.+/,
          bodyDescr: 'encrypted body',
        }];

        encryptionOptions.forEach((opt) => {
          describe(`when ${opt.status}`, () => {
            TEST_RECORDS.forEach((testCase, idx) => {
              context(`with test case ${idx}`, () => {
                it(`should hash keys and send ${opt.bodyDescr}`, async () => {
                  const storage = opt.encrypted ? encStorage : noEncStorage;
                  const encrypted = await storage.encryptPayload(testCase);
                  const [bodyObj, result] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
                  expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
                  expect(bodyObj.body).to.match(opt.bodyRegExp);
                  expect(result.record).to.deep.equal(testCase);
                });
              });
            });
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.write(COUNTRY, TEST_RECORDS[0])]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });
    });

    describe('read', () => {
      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.read(undefined, '')).to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.read(COUNTRY, undefined)).to.be.rejectedWith(Error, RECORD_KEY_ERROR_MESSAGE);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await encStorage.encryptPayload(testCase);
                nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
                  .reply(200, encryptedPayload);

                const { record } = await encStorage.read(COUNTRY, testCase.key);
                expect(record).to.deep.equal(testCase);
              });
            });
          });
        });

        describe('when disabled', () => {
          it('should read a record', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await noEncStorage.encryptPayload(recordData);
            expect(encryptedPayload.body).to.match(/^pt:.+/);
            nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
              .reply(200, encryptedPayload);

            const { record } = await noEncStorage.read(COUNTRY, recordData.key);
            expect(record).to.deep.include(recordData);
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
            .reply(200, encryptedPayload);

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.read(COUNTRY, TEST_RECORDS[0].key)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });
    });

    describe('delete', () => {
      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.delete(undefined, '')).to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.delete(COUNTRY, undefined)).to.be.rejectedWith(Error, RECORD_KEY_ERROR_MESSAGE);
          });
        });
      });

      describe('encryption', () => {
        const key = 'test';

        it('should hash key regardless of enabled/disabled encryption', async () => {
          const encryptedKey = encStorage.createKeyHash(key);
          const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encryptedKey)
            .times(2)
            .reply(200, { success: true });

          await encStorage.delete(COUNTRY, key);
          await noEncStorage.delete(COUNTRY, key);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should delete a record', async () => {
              const encryptedPayload = await encStorage.encryptPayload(testCase);
              const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encryptedPayload.key).reply(200, { success: true });

              const result = await encStorage.delete(COUNTRY, testCase.key);
              expect(result).to.deep.equal({ success: true });
              assert.equal(popAPI.isDone(), true, 'nock is done');
            });
          });
        });
      });

      describe('errors handling', () => {
        it('should throw an error when record not found', async () => {
          const key = 'invalid';
          const scope = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encStorage.createKeyHash(key)).reply(404);

          await expect(encStorage.delete(COUNTRY, key)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encryptedPayload.key).reply(200, { success: true });

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.delete(COUNTRY, TEST_RECORDS[0].key)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });
    });

    describe('find', () => {
      const keys = ['key', 'key2', 'key3', 'profile_key'];

      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.find(country))
              .to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });

        describe('when options.limit is not positive integer or greater than MAX_LIMIT', () => {
          it('should throw an error', async () => {
            nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
            nockEndpoint(POPAPI_HOST, 'find', COUNTRY, 'test').reply(200, {
              meta: {
                total: 0, count: 0, limit: 100, offset: 0,
              },
              data: [],
            });

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            await Promise.all(nonPositiveLimits.map((limit) => expect(encStorage.find(COUNTRY, undefined, { limit }))
              .to.be.rejectedWith(Error, LIMIT_ERROR_MESSAGE_INT)));
            await expect(encStorage.find(COUNTRY, undefined, { limit: MAX_LIMIT + 1 }))
              .to.be.rejectedWith(Error, LIMIT_ERROR_MESSAGE_MAX);
            await expect(encStorage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
          });
        });
      });

      describe('encryption', () => {
        it('should hash filters regardless of enabled/disabled encryption', async () => {
          const filter = { key: [uuid(), uuid()] };
          const hashedFilter = { key: filter.key.map((el) => encStorage.createKeyHash(el)) };

          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .times(2)
            .reply(200, {
              meta: {
                total: 0, count: 0, limit: 100, offset: 0,
              },
              data: [],
            });

          let [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), noEncStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        keys.forEach((key) => {
          it(`should hash ${key} in filters request and decrypt returned data correctly`, async () => {
            const filter = { [key]: TEST_RECORDS[4][key] };
            const hashedFilter = { [key]: encStorage.createKeyHash(filter[key]) };
            let requestedFilter;

            const resultRecords = TEST_RECORDS.filter((rec) => rec[key] === filter[key]);
            const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));

            nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
              .reply(200, (uri, requestBody) => {
                requestedFilter = requestBody.filter;
                return {
                  meta: {
                    total: encryptedRecords.length, count: encryptedRecords.length, limit: 100, offset: 0,
                  },
                  data: encryptedRecords,
                };
              });

            const result = await encStorage.find(COUNTRY, filter, {});
            expect(result.records).to.deep.equal(resultRecords);
            expect(requestedFilter).to.deep.equal(hashedFilter);
          });
        });

        it('should decode not encrypted records correctly', async () => {
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)));

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, {
              meta: {
                total: storedData.length, count: storedData.length, limit: 100, offset: 0,
              },
              data: storedData,
            });

          const { records } = await noEncStorage.find(COUNTRY, { key: 'key1' });
          expect(records).to.deep.equal(TEST_RECORDS);
        });
      });
    });

    describe('findOne', () => {
      it('should return null when no results found', async () => {
        nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, {
          meta: {
            total: 0, count: 0, limit: 100, offset: 0,
          },
          data: [],
        });

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key3', async () => {
        const filter = { key3: TEST_RECORDS[4].key3 };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key3 === filter.key3);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));

        nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, {
            meta: {
              total: encryptedRecords.length, count: encryptedRecords.length, limit: 100, offset: 0,
            },
            data: encryptedRecords,
          });
        const result = await encStorage.findOne(COUNTRY, filter);
        expect(result.record).to.deep.eql(TEST_RECORDS[4]);
      });
    });

    describe('updateOne', () => {
      const preparePOPAPI = async (record) => {
        const encryptedRecord = await encStorage.encryptPayload(record);
        const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, {
            meta: {
              total: 1, count: 1, limit: 100, offset: 0,
            },
            data: [encryptedRecord],
          });
        const popAPIWrite = nockEndpoint(POPAPI_HOST, 'write', COUNTRY).reply(200, 'OK');
        return [popAPIFind, popAPIWrite];
      };

      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.updateOne(country))
              .to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE)));
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
          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, {
              meta: {
                total: 2, count: 2, limit: 100, offset: 0,
              },
              data: [],
            });
          await expect(encStorage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Multiple records found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should reject if no records found', async () => {
          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, {
              meta: {
                total: 0, count: 0, limit: 100, offset: 0,
              },
              data: [],
            });
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
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const findResponse = {
            meta: {
              total: encryptedRecords.length, count: encryptedRecords.length, limit: 100, offset: 0,
            },
            data: encryptedRecords,
          };
          const migrateResult = { meta: { migrated: encryptedRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };
          encStorage.setSecretKeyAccessor(new SecretKeyAccessor(() => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          })));

          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, findResponse);
          const popAPIBatchWrite = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200);

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
        popAPI = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200);
      });

      describe('should validate arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.batchWrite(country))
              .to.be.rejectedWith(Error, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });
      });

      describe('should validate records', () => {
        const errorCases = [{
          name: 'when the records is empty array',
          arg: [],
          error: 'Invalid value []',
        }, {
          name: 'when the record has no key field',
          arg: [{}],
          error: 'Invalid value undefined',
        }];

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            await expect(encStorage.batchWrite(COUNTRY, errCase.arg)).to.be.rejectedWith(Error, errCase.error);
          });
        });
      });

      describe('encryption', () => {
        const encryptionOptions = [{
          status: 'disabled',
          encrypted: false,
          testCaseName: 'encoded records',
        }, {
          status: 'enabled',
          encrypted: true,
          testCaseName: 'encrypted records',
        }];

        encryptionOptions.forEach((opt) => {
          describe(`when ${opt.status}`, () => {
            it(`should batch write ${opt.testCaseName}`, async () => {
              const storage = opt.encrypted ? encStorage : noEncStorage;
              const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
              const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord) => storage.decryptPayload(encRecord)));
              expect(decryptedRecords).to.deep.equal(TEST_RECORDS);
            });
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          nock.cleanAll();
          const scope = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(encStorage.batchWrite(COUNTRY, TEST_RECORDS)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });
  });

  describe('helper methods', () => {
    const countriesCache = createFakeCountriesCache([
      { id: 'BE', name: 'Belgium', direct: true },
      { id: 'HU', name: 'Hungary', direct: true },
    ]);

    beforeEach(() => {
      nock.disableNetConnect();
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('getEndpoint', () => {
      let nockPB;
      const getCustomStorage = (endpoint = undefined, cache = undefined) => {
        const options = {
          apiKey: 'string',
          environmentId: 'string',
          endpoint,
        };
        return new Storage(options, new SecretKeyAccessor(() => SECRET_KEY), LOGGER_STUB, cache);
      };

      const expectCorrectURLReturned = async (storage, country, host) => {
        const writePath = popAPIEndpoints.write.path(country);
        const result = await storage.getEndpoint(country, writePath.replace(/^\//, ''));
        assert.equal(nockPB.isDone(), false, 'PB was not called');
        expect(result).to.equal(`${host}${writePath}`);
      };

      beforeEach(() => {
        nockPB = nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
      });

      describe('if the endpoint was set during storage creation', () => {
        it('should use the provided endpoint', async () => {
          const storage = getCustomStorage(CUSTOM_STORAGE_ENDPOINT);
          await expectCorrectURLReturned(storage, COUNTRY, CUSTOM_STORAGE_ENDPOINT);
        });
      });

      describe('otherwise it should request country data from CountriesCache', () => {
        let storage;
        beforeEach(() => {
          storage = getCustomStorage(undefined, countriesCache);
        });

        it('should use the endpoint provided by CountriesCache if it matches requested country', async () => {
          const country = 'hu';
          const customPOPAPIHost = `https://${country}.api.incountry.io`;
          await expectCorrectURLReturned(storage, country, customPOPAPIHost);
        });

        it('should use the default endpoint otherwise', async () => {
          const country = 'ae';
          await expectCorrectURLReturned(storage, country, POPAPI_HOST);
        });
      });

      describe('when CountriesCache threw an error', () => {
        it('should use the default host', async () => {
          const failingCache = new CountriesCache();
          failingCache.getCountriesAsync = () => {
            throw new Error('test');
          };
          const storage = getCustomStorage(undefined, failingCache);

          const country = 'ae';
          await expectCorrectURLReturned(storage, country, POPAPI_HOST);
        });
      });
    });

    describe('apiClient', () => {
      let encStorage;

      beforeEach(() => {
        encStorage = getDefaultStorage(true);
      });

      describe('errors handling', () => {
        const writePath = popAPIEndpoints.write.path(COUNTRY).replace(/^\//, '');
        const params = { method: 'post', data: {} };
        const errorCases = [{
          name: 'on 404',
          respond: (popAPI) => popAPI.reply(404),
        }, {
          name: 'on 500',
          respond: (popAPI) => popAPI.reply(500),
        }, {
          name: 'in case of network error',
          respond: (popAPI) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
        }];

        errorCases.forEach((errCase) => {
          it(`should throw StorageServerError ${errCase.name}`, async () => {
            const scope = errCase.respond(nockEndpoint(POPAPI_HOST, 'write', COUNTRY));
            await expect(encStorage.apiClient(COUNTRY, writePath, params)).to.be.rejectedWith(StorageServerError);
            assert.equal(scope.isDone(), true, 'Nock scope is done');
          });
        });
      });

      describe('should make GET request by default', () => {
        const runApiClientWithParams = async (params) => {
          const readPath = popAPIEndpoints.read.path(COUNTRY, 'key').replace(/^\//, '');
          const scope = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, 'key').reply(200);
          await encStorage.apiClient(COUNTRY, readPath, params);
          expect(scope.isDone()).to.eq(true);
        };

        it('when called without parameters', async () => {
          await runApiClientWithParams();
        });

        it('when method not specified in parameters', async () => {
          await runApiClientWithParams({ data: 'test' });
        });
      });
    });
  });
});
