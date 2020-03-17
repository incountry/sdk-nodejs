const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const createStorage = require('../../storage');
const { StorageServerError, StorageClientError } = require('../../errors');
const CountriesCache = require('../../countries-cache');
const {
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
  nockEndpoint,
} = require('../test-helpers/popapi-nock');
const { COUNTRY_CODE_ERROR_MESSAGE } = require('../../validation/country-code');
const { RECORD_KEY_ERROR_MESSAGE } = require('../../validation/record-key');
const {
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
} = require('../../validation/custom-encryption-configs');
const { MAX_LIMIT, LIMIT_ERROR_MESSAGE_INT, LIMIT_ERROR_MESSAGE_MAX } = require('../../validation/limit');

const { expect, assert } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
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

const defaultGetSecretCallback = () => SECRET_KEY;

const getDefaultStorage = async (encrypt, normalizeKeys, getSecretCallback = defaultGetSecretCallback) => createStorage({
  apiKey: 'string',
  environmentId: 'string',
  endpoint: POPAPI_HOST,
  encrypt,
  normalizeKeys,
}, getSecretCallback, LOGGER_STUB);

const getDefaultFindResponse = (count, data) => ({
  meta: {
    total: count, count, limit: 100, offset: 0,
  },
  data,
});

describe('Storage', () => {
  describe('interface methods', () => {
    let encStorage;
    let noEncStorage;

    beforeEach(async () => {
      nock.disableNetConnect();
      encStorage = await getDefaultStorage(true);
      noEncStorage = await getDefaultStorage(false);
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

          it('should be provided via either options or environment variable', async () => {
            await Promise.all([{}, { apiKey: undefined }].map(async (options) => {
              await expect(createStorage(options))
                .to.be.rejectedWith(Error, 'Please pass apiKey in options or set INC_API_KEY env var');
            }));

            await expect(createStorage({ apiKey: 'apiKey', environmentId: 'envId', encrypt: false })).not.to.be.rejectedWith(Error);

            process.env.INC_API_KEY = 'apiKey';

            await expect(createStorage({ environmentId: 'envId', encrypt: false })).not.to.be.rejectedWith(Error);
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

          it('should be provided via either options or environment variable', async () => {
            await Promise.all([{ apiKey: 'apiKey' }, { apiKey: 'apiKey', environmentId: undefined }].map(async (options) => {
              await expect(createStorage(options))
                .to.be.rejectedWith(Error, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
            }));

            await expect(createStorage({ apiKey: 'apiKey', environmentId: 'envId', encrypt: false })).not.to.be.rejectedWith(Error);

            process.env.INC_ENVIRONMENT_ID = 'envId';

            await expect(createStorage({ apiKey: 'apiKey', encrypt: false })).not.to.be.rejectedWith(Error);
          });
        });
      });

      describe('secretKeyAccessor', () => {
        it('should throw an error if encryption is enabled and no secretKeyAccessor provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
            },
          )).to.be.rejectedWith(Error, 'Provide callback function for secretData');
        });

        it('should not throw an error if encryption is disabled and no secretKeyAccessor provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              encrypt: false,
            },
          )).not.to.be.rejectedWith(Error, 'secretKeyAccessor must be an instance of SecretKeyAccessor');
        });

        it('should throw an error if malformed secretData is provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
            }, () => { },
          )).to.be.rejectedWith(Error, '<SecretsData> should be SecretsData but got undefined');
        });

        it('should throw an error if not a getSecretKey callback is provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
            }, {},
          )).to.be.rejectedWith(Error, 'Provide callback function for secretData');
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', async () => {
          const expectStorageConstructorThrowsError = async (wrongLogger) => expect(createStorage({ encrypt: false }, undefined, wrongLogger, undefined))
            .to.be.rejectedWith(Error, 'Logger must implement write function');


          const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
          await Promise.all(wrongLoggers.map((item) => expectStorageConstructorThrowsError(item)));
        });

        it('should throw an error if provided logger.write is a function with less than 2 arguments', async () => {
          const expectStorageConstructorThrowsError = async (wrongLogger) => expect(createStorage({ encrypt: false }, undefined, wrongLogger, undefined))
            .to.be.rejectedWith(Error, 'Logger.write must have at least 2 parameters');


          const expectStorageConstructorNotThrowsError = async (correctLogger) => expect(createStorage({
            apiKey: 'string',
            environmentId: 'string',
            encrypt: false,
          }, undefined, correctLogger, undefined)).not.to.be.rejected;


          const wrongLoggers = [{ write: () => null }, { write: (a) => a }];
          await Promise.all(wrongLoggers.map((item) => expectStorageConstructorThrowsError(item)));

          const correctLoggers = [{ write: (a, b) => [a, b] }, { write: (a, b, c) => [a, b, c] }];
          await Promise.all(correctLoggers.map((item) => expectStorageConstructorNotThrowsError(item)));
        });
      });
    });

    describe('setLogger', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(async () => {
        storage = await createStorage({ apiKey: 'apiKey', environmentId: 'envId', encrypt: false });
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

    describe('setCountriesCache', () => {
      it('should throw an error if not instance of CountriesCache was passed as argument', async () => {
        /** @type {import('../../storage')} */
        const storage = await createStorage({ apiKey: 'apiKey', environmentId: 'envId', encrypt: false });
        const wrongCountriesCaches = [null, undefined, false, {}];
        wrongCountriesCaches.forEach((item) => {
          expect(() => storage.setCountriesCache(item)).to.throw(Error, 'You must pass an instance of CountriesCache');
        });
        expect(() => storage.setCountriesCache(new CountriesCache())).not.to.throw();
      });
    });

    describe('setCustomEncryption', () => {
      it('should throw an error when setting custom encryption configs with disabled encryption', async () => {
        const storage = await createStorage({
          apiKey: 'string',
          environmentId: 'string',
          endpoint: POPAPI_HOST,
          encrypt: false,
        }, defaultGetSecretCallback, LOGGER_STUB);

        const customEncryptionConfigs = [{ encrypt: () => { }, decrypt: () => { }, version: '' }];

        expect(() => storage.setCustomEncryption(customEncryptionConfigs)).to.throw(StorageClientError, 'Cannot use custom encryption when encryption is off');
      });

      it('should throw an error if configs object is malformed', () => {
        ['', {}, () => { }].forEach((configs) => {
          expect(() => encStorage.setCustomEncryption(configs)).to.throw(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY);
        });
      });

      it('should throw an error if 2 configs are marked as current', () => {
        const configs = [{
          encrypt: () => { }, decrypt: () => { }, isCurrent: true, version: '1',
        }, {
          encrypt: () => { }, decrypt: () => { }, isCurrent: true, version: '2',
        }];

        expect(() => encStorage.setCustomEncryption(configs)).to.throw(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT);
      });

      it('should throw an error if 2 configs have same version', () => {
        const configs = [{
          encrypt: () => { }, decrypt: () => { }, version: '1',
        }, {
          encrypt: () => { }, decrypt: () => { }, isCurrent: true, version: '1',
        }];

        expect(() => encStorage.setCustomEncryption(configs)).to.throw(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
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
            await expect(encStorage.write(COUNTRY, {})).to.be.rejectedWith(Error, 'Storage.write() Validation Error: <Record>.key should be string but got undefined');
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

      describe('custom encryption', () => {
        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should write data into storage', async () => {
              const storage = encStorage;
              storage.setCustomEncryption([{
                encrypt: (text) => Buffer.from(text).toString('base64'),
                decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
                version: 'customEncryption',
                isCurrent: true,
              }]);

              const encryptedPayload = await storage.encryptPayload(testCase);

              const [bodyObj, result] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
              expect(bodyObj.body).to.equal(encryptedPayload.body);
              expect(result.record).to.deep.equal(testCase);
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

      describe('normalize keys option', () => {
        const key = 'aAbB';
        const keyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const record = { key };
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect(bodyObj.key).to.equal(storage.createKeyHash(keyNormalized));
          });
        });


        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const record = { key };
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect(bodyObj.key).to.equal(storage.createKeyHash(key));
          });
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

      describe('custom encryption', () => {
        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should read custom encrypted record', async () => {
              const storage = encStorage;
              storage.setCustomEncryption([{
                encrypt: (text) => Buffer.from(text).toString('base64'),
                decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
                version: 'customEncryption',
                isCurrent: true,
              }]);

              const encryptedPayload = await storage.encryptPayload(testCase);
              nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
                .reply(200, encryptedPayload);

              const { record } = await storage.read(COUNTRY, testCase.key);
              expect(record).to.deep.equal(testCase);
            });
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

      describe('normalize keys option', () => {
        const key = 'aAbB';
        const keyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ key });

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(keyNormalized))
              .reply(200, encryptedPayload);

            await storage.read(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });

          it('should return record with original keys', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ key });
            nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(keyNormalized))
              .reply(200, encryptedPayload);

            const { record } = await storage.read(COUNTRY, key);
            expect(record.key).to.equal(key);
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const encryptedPayload = await storage.encryptPayload({ key });
            expect(encryptedPayload.key).to.equal(storage.createKeyHash(key));

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(key))
              .reply(200, encryptedPayload);

            const { record } = await storage.read(COUNTRY, key);
            expect(record.key).to.equal(key);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
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

      describe('normalize keys option', () => {
        const key = 'aAbB';
        const keyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, storage.createKeyHash(keyNormalized))
              .reply(200);

            await storage.delete(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, storage.createKeyHash(key))
              .reply(200);

            await storage.delete(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
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
            nockEndpoint(POPAPI_HOST, 'find', COUNTRY, 'test').reply(200, getDefaultFindResponse(0, []));

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
            .reply(200, getDefaultFindResponse(0, []));

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
                return getDefaultFindResponse(encryptedRecords.length, encryptedRecords);
              });

            const result = await encStorage.find(COUNTRY, filter, {});
            expect(result.records).to.deep.equal(resultRecords);
            expect(requestedFilter).to.deep.equal(hashedFilter);
          });
        });

        it('should decode not encrypted records correctly', async () => {
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)));

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(storedData.length, storedData));

          const { records } = await noEncStorage.find(COUNTRY, { key: 'key1' });
          expect(records).to.deep.equal(TEST_RECORDS);
        });

        it('should not throw if some records cannot be decrypted', async () => {
          const encryptedData = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const unsupportedData = {
            country: 'us',
            key: 'somekey',
            body: '2:unsupported data',
            version: 0,
          };
          const data = [...encryptedData, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data.length, data));

          const result = await encStorage.find('us', {});

          expect(result).to.deep.equal({
            meta: {
              count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
            },
            records: TEST_RECORDS,
            errors: [{
              error: 'Invalid IV length',
              rawData: unsupportedData,
            }],
          });
        });

        it('find() in non-encrypted mode should not throw error if some records are encrypted', async () => {
          const nonEncryptedData = await Promise.all(
            TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)),
          );
          const unsupportedData = {
            country: 'us',
            key: 'somekey',
            body: '2:unsupported data',
            version: 0,
          };
          const data = [...nonEncryptedData, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data.length, data));

          const result = await noEncStorage.find('us', {});
          expect(result).to.deep.equal({
            meta: {
              count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
            },
            records: TEST_RECORDS,
            errors: [{
              error: 'No secretKeyAccessor provided. Cannot decrypt encrypted data',
              rawData: unsupportedData,
            }],
          });
        });
      });

      describe('normalize keys option', () => {
        const key = 'aAbB';
        const keyNormalized = 'aabb';

        let popAPI;
        beforeEach(() => {
          popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, {
              meta: {
                count: 0, limit: 100, offset: 0, total: 0,
              },
              data: [],
            });
        });

        describe('when enabled', () => {
          it('should normalize filter object', async () => {
            const storage = await getDefaultStorage(true, true);
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { key })]);
            expect(bodyObj.filter.key).to.equal(storage.createKeyHash(keyNormalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize filter object', async () => {
            const storage = await getDefaultStorage(true);
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { key })]);
            expect(bodyObj.filter.key).to.equal(storage.createKeyHash(key));
          });
        });
      });
    });

    describe('findOne', () => {
      it('should enforce limit:1', async () => {
        const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, {
            meta: {
              count: 0, limit: 100, offset: 0, total: 0,
            },
            data: [],
          });

        const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.findOne(COUNTRY, { key: '' }, { limit: 100 })]);
        expect(bodyObj.options).to.deep.equal({ limit: 1 });
      });

      it('should return null when no results found', async () => {
        nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse(0, []));

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key3', async () => {
        const filter = { key3: TEST_RECORDS[4].key3 };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key3 === filter.key3);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));

        nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, getDefaultFindResponse(encryptedRecords.length, encryptedRecords));
        const result = await encStorage.findOne(COUNTRY, filter);
        expect(result.record).to.deep.eql(TEST_RECORDS[4]);
      });
    });

    describe('updateOne', () => {
      const preparePOPAPI = async (record) => {
        const encryptedRecord = await encStorage.encryptPayload(record);
        const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, getDefaultFindResponse(1, [encryptedRecord]));
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
            .reply(200, getDefaultFindResponse(2, []));
          await expect(encStorage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Multiple records found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });

        it('should reject if no records found', async () => {
          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(0, []));
          await expect(encStorage.updateOne(COUNTRY, {}, {})).to.be.rejectedWith(Error, 'Record not found');
          assert.equal(popAPIFind.isDone(), true, 'find() called');
        });
      });

      describe('normalize keys option', () => {
        const key = 'aAbB';
        const keyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize filter object', async () => {
            const [popAPIFind, popAPIWrite] = await preparePOPAPI({ key });

            const storage = await getDefaultStorage(true, true);
            const [findBodyObj, writeBodyObj] = await Promise.all([
              getNockedRequestBodyObject(popAPIFind),
              getNockedRequestBodyObject(popAPIWrite),
              storage.updateOne(COUNTRY, { key }, { range: 1 }),
            ]);
            expect(findBodyObj.filter.key).to.equal(storage.createKeyHash(keyNormalized));
            expect(writeBodyObj.key).to.equal(storage.createKeyHash(keyNormalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize filter object', async () => {
            const [popAPIFind, popAPIWrite] = await preparePOPAPI({ key });

            const storage = await getDefaultStorage(true);
            const [findBodyObj, writeBodyObj] = await Promise.all([
              getNockedRequestBodyObject(popAPIFind),
              getNockedRequestBodyObject(popAPIWrite),
              storage.updateOne(COUNTRY, { key }, { range: 1 }),
            ]);
            expect(findBodyObj.filter.key).to.equal(storage.createKeyHash(key));
            expect(writeBodyObj.key).to.equal(storage.createKeyHash(key));
          });
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
          const migrateResult = { meta: { migrated: encryptedRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };

          const encStorage2 = await getDefaultStorage(true, false, () => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          }));

          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse(encryptedRecords.length, encryptedRecords));
          const popAPIBatchWrite = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200, 'OK');

          const result = await encStorage2.migrate(COUNTRY, TEST_RECORDS.length);
          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });
    });

    describe('batchWrite', () => {
      let popAPI;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200, 'OK');
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
          name: 'when the records has wrong type',
          arg: 'recordzzz',
          error: 'Storage.batchWrite() Validation Error: You must pass non-empty array of records',
        }, {
          name: 'when the records is empty array',
          arg: [],
          error: 'Storage.batchWrite() Validation Error: You must pass non-empty array of records',
        }, {
          name: 'when any record has no key field',
          arg: [{}],
          error: 'Storage.batchWrite() Validation Error: <RecordsArray>.0.key should be string but got undefined',
        },
        {
          name: 'when any record has no key field',
          arg: [{ key: '1' }, {}],
          error: 'Storage.batchWrite() Validation Error: <RecordsArray>.1.key should be string but got undefined',
        },
        {
          name: 'when any record has wrong format',
          arg: [{ key: '1', key2: 41234512 }],
          error: 'Storage.batchWrite() Validation Error: <RecordsArray>.0.key2 should be (string | null | undefined) but got 41234512',
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

      describe('normalize keys option', () => {
        const key1 = 'aAbB';
        const key1Normalized = 'aabb';
        const key2 = 'cCdD';
        const key2Normalized = 'ccdd';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const records = [{ key: key1 }, { key: key2 }];
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].key).to.equal(storage.createKeyHash(key1Normalized));
            expect(bodyObj.records[1].key).to.equal(storage.createKeyHash(key2Normalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const records = [{ key: key1 }, { key: key2 }];
            const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].key).to.equal(storage.createKeyHash(key1));
            expect(bodyObj.records[1].key).to.equal(storage.createKeyHash(key2));
          });
        });
      });
    });
  });
});
