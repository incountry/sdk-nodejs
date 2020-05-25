const chai = require('chai');
const sinon = require('sinon');

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const { identity } = require('fp-ts/lib/function');
const { createStorage } = require('../../lib/storage');
const { StorageServerError, StorageClientError, StorageError } = require('../../lib/errors');
const { CountriesCache } = require('../../lib/countries-cache');
const {
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
  nockEndpoint,
} = require('../test-helpers/popapi-nock');
const { COUNTRY_CODE_ERROR_MESSAGE } = require('../../lib/validation/country-code');
const { RECORD_KEY_ERROR_MESSAGE } = require('../../lib/validation/record-key');
const {
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
} = require('../../lib/validation/custom-encryption-configs');
const { MAX_LIMIT, LIMIT_ERROR_MESSAGE_INT, LIMIT_ERROR_MESSAGE_MAX } = require('../../lib/validation/limit');

const { expect, assert } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
const sdkVersionRegExp = /^SDK-Node\.js\/\d+\.\d+\.\d+/;

const EMPTY_RECORD = {
  body: null,
  key2: null,
  key3: null,
  profile_key: null,
  range_key: null,
};

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


const PREPARED_PAYLOAD_STORED = {
  key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
  body: '2:IGJNCmV+RXZydaPxDjjhZ80/6aZ2vcEUZ2GuOzKgVSSdM6gYf5RPgFbyLqv+7ihz0CpYFQQWf9xkIyD/u3VYky8dWLq+NXcE2xYL4/U7LqUZmJPQzgcQCABYQ/8vOvUEcrfOAwzGjR6etTp1ki+79JmCEZFSNqcDP1GZXNLFdLoSUp1X2wVlH9ukhJ4jrE0cKDrpJllswRSOz0BhS8PA/73KNKwo718t7fPWpUm7RkyILwYTd/LpPvpXMS6JypEns8fviOpbCLQPpZNBe6zpwbFf3C0qElHlbCyPbDyUiMzVKOwWlYFpozFcRyWegjJ42T8v52+GuRY5',
  key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
  key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
  profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
  range_key: 100500,
  version: 0,
};

const PREPARED_PAYLOAD_DECRYPTED = {
  key: 'InCountryKey',
  key2: 'InCountryKey2',
  key3: 'InCountryKey3',
  profile_key: 'InCountryPK',
  body: '{"data": "InCountryBody"}',
  range_key: 100500,
};

const LOGGER_STUB = { write: (a, b) => [a, b] };

const defaultGetSecretsCallback = () => SECRET_KEY;

const getDefaultStorage = async (encrypt, normalizeKeys, getSecrets = defaultGetSecretsCallback, customEncConfigs) => createStorage({
  apiKey: 'string',
  environmentId: 'string',
  endpoint: POPAPI_HOST,
  encrypt,
  normalizeKeys,
  getSecrets,
  logger: LOGGER_STUB,
}, customEncConfigs);

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
        describe('endpoint', () => {
          let envApiKey;
          let envEnvironmentId;

          beforeEach(() => {
            envApiKey = process.env.INC_API_KEY;
            delete process.env.INC_API_KEY;

            envEnvironmentId = process.env.INC_ENVIRONMENT_ID;
            delete process.env.INC_ENVIRONMENT_ID;
          });

          afterEach(() => {
            process.env.INC_API_KEY = envApiKey;
            process.env.INC_ENVIRONMENT_ID = envEnvironmentId;
          });

          it('should be string ', async () => {
            await Promise.all([{ endpoint: [] }, { endpoint: 123 }].map(async (options) => {
              await expect(createStorage(options))
                .to.be.rejectedWith(StorageError, 'endpoint should be string');
            }));
          });

          it('should not throw error if endpoint missing', async () => {
            process.env.INC_API_KEY = 'apiKey';
            process.env.INC_ENVIRONMENT_ID = 'envId';
            await expect(createStorage({ encrypt: false })).not.to.be.rejected;
          });
        });

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
            await Promise.all([{ }, { apiKey: undefined }].map(async (options) => {
              await expect(createStorage(options))
                .to.be.rejectedWith(StorageError, 'Please pass apiKey in options or set INC_API_KEY env var');
            }));

            await expect(createStorage({
              apiKey: 'apiKey',
              environmentId: 'envId',
              encrypt: false,
            })).not.to.be.rejectedWith(StorageError);

            process.env.INC_API_KEY = 'apiKey';

            await expect(createStorage({ environmentId: 'envId', encrypt: false })).not.to.be.rejectedWith(StorageError);
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
                .to.be.rejectedWith(StorageError, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
            }));

            await expect(createStorage({
              apiKey: 'apiKey',
              environmentId: 'envId',
              encrypt: false,

            })).not.to.be.rejected;

            process.env.INC_ENVIRONMENT_ID = 'envId';

            await expect(createStorage({ apiKey: 'apiKey', encrypt: false })).not.to.be.rejectedWith(StorageError);
          });
        });

        describe('oauth', () => {
          const baseOptions = {
            apiKey: 'apiKey', environmentId: 'envId', encrypt: false, oauth: {},
          };

          describe('clientId', () => {
            let clientId;

            beforeEach(() => {
              clientId = process.env.INC_CLIENT_ID;
              delete process.env.INC_CLIENT_ID;
            });

            afterEach(() => {
              process.env.INC_CLIENT_ID = clientId;
            });

            it('should be provided via either options or environment variable', async () => {
              await Promise.all([baseOptions, { ...baseOptions, oauth: { clientId: undefined } }].map(async (options) => {
                await expect(createStorage(options))
                  .to.be.rejectedWith(StorageClientError, 'Please pass clientId in options or set INC_CLIENT_ID env var');
              }));
              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: 'clientSecret' } })).not.to.be.rejected;
              process.env.INC_CLIENT_ID = 'clientId';
              await expect(createStorage({ ...baseOptions, oauth: { clientSecret: 'clientSecret' } })).not.to.be.rejected;
            });
          });

          describe('clientSecret', () => {
            let clientSecret;

            beforeEach(() => {
              clientSecret = process.env.INC_CLIENT_SECRET;
              delete process.env.INC_CLIENT_SECRET;
            });

            afterEach(() => {
              process.env.INC_CLIENT_SECRET = clientSecret;
            });

            it('should be provided via either options or environment variable', async () => {
              await Promise.all([baseOptions, { ...baseOptions, oauth: { clientId: 'clientId', clientSecret: undefined } }].map(async (options) => {
                await expect(createStorage(options))
                  .to.be.rejectedWith(StorageClientError, 'Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
              }));
              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: 'clientSecret' } })).not.to.be.rejected;
              process.env.INC_CLIENT_SECRET = 'clientSecret';
              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId' } })).not.to.be.rejected;
            });
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
          )).to.be.rejectedWith(StorageError, 'Provide callback function for secretData');
        });

        it('should not throw an error if encryption is disabled and no secretKeyAccessor provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              encrypt: false,
            },
          )).not.to.be.rejected;
        });

        it('should throw an error if malformed secretData is provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              getSecrets: () => { },
            },
          )).to.be.rejectedWith(StorageError, '<SecretsData> should be SecretsData but got undefined');

          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              getSecrets: () => ({ secrets: [{ version: -1, secret: '' }], currentVersion: -1 }),
            },
          )).to.be.rejectedWith(StorageError, '<SecretsData>.secrets.0 should be SecretOrKey but got {"version":-1,"secret":""}');
        });

        it('should throw an error if not a getSecrets callback is provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              getSecrets: {},
            },
          )).to.be.rejectedWith(StorageError, 'getSecrets should be Function');
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', async () => {
          const expectStorageConstructorThrowsError = async (wrongLogger) => expect(createStorage({ encrypt: false, logger: wrongLogger }))
            .to.be.rejectedWith(StorageError, 'logger');


          const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
          await Promise.all(wrongLoggers.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });
    });

    describe('setLogger', () => {
      /** @type {import('../../storage')} */
      let storage;

      beforeEach(async () => {
        storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
      });

      it('should throw an error if called with falsy argument', () => {
        [null, undefined, false].forEach((logger) => {
          expect(() => storage.setLogger(logger)).to.throw(StorageError, '<Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger is not object or has no "write" method', () => {
        const wrongLoggers = [42, () => null];
        wrongLoggers.forEach((logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(StorageError, '<Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger\'s "write" method is not a function', () => {
        const wrongLoggers = [{}, { write: 'write' }, { write: {} }];
        wrongLoggers.forEach((logger) => {
          expect(() => storage.setLogger(logger))
            .to.throw(StorageError, '<Logger>.write should be Function');
        });
      });
    });

    describe('setCountriesCache', () => {
      it('should throw an error if not instance of CountriesCache was passed as argument', async () => {
        /** @type {import('../../storage')} */
        const storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
        const wrongCountriesCaches = [null, undefined, false, {}];
        wrongCountriesCaches.forEach((item) => {
          expect(() => storage.setCountriesCache(item)).to.throw(StorageError, 'You must pass an instance of CountriesCache');
        });
        expect(() => storage.setCountriesCache(new CountriesCache())).not.to.throw();
      });
    });

    describe('initialize', () => {
      it('should throw an error when setting custom encryption configs with disabled encryption', async () => {
        const options = {
          apiKey: 'string',
          environmentId: 'string',
          endpoint: POPAPI_HOST,
          encrypt: false,
          logger: LOGGER_STUB,
        };

        const customEncryptionConfigs = [{ encrypt: () => { }, decrypt: () => { }, version: '' }];

        await expect(createStorage(options, customEncryptionConfigs))
          .to.be.rejectedWith(StorageClientError, 'Cannot use custom encryption when encryption is off');
      });

      it('should throw an error if configs object is malformed', () => Promise.all(['', {}, () => { }]
        .map(async (configs) => {
          const options = {
            apiKey: 'string',
            environmentId: 'string',
            endpoint: POPAPI_HOST,
            logger: LOGGER_STUB,
            getSecrets: () => '',
          };

          await expect(createStorage(options, configs), `with ${JSON.stringify(configs)}`)
            .to.be.rejectedWith(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY);
        })));

      it('should throw an error if 2 configs are marked as current', async () => {
        const configs = [{
          encrypt: identity, decrypt: identity, isCurrent: true, version: '1',
        }, {
          encrypt: identity, decrypt: identity, isCurrent: true, version: '2',
        }];

        const options = {
          apiKey: 'string',
          environmentId: 'string',
          endpoint: POPAPI_HOST,
          logger: LOGGER_STUB,
          getSecrets: () => '',
        };

        await expect(createStorage(options, configs))
          .to.be.rejectedWith(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT);
      });

      it('should throw an error if 2 configs have same version', async () => {
        const configs = [{
          encrypt: identity, decrypt: identity, version: '1',
        }, {
          encrypt: identity, decrypt: identity, isCurrent: true, version: '1',
        }];

        const options = {
          apiKey: 'string',
          environmentId: 'string',
          endpoint: POPAPI_HOST,
          logger: LOGGER_STUB,
          getSecrets: () => '',
        };

        await expect(createStorage(options, configs))
          .to.be.rejectedWith(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
      });
    });

    describe('logging', () => {
      it('should receive all 3 arguments', async () => {
        const logger = {
          write: sinon.fake(),
        };

        const storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
          logger,
        });

        const key = '123';
        const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, key });
        nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
          .reply(200, encryptedPayload);

        await expect(storage.read(COUNTRY, key)).to.be.rejectedWith(StorageError);
        expect(logger.write.lastCall.args).to.have.length(3);
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
            await expect(encStorage.write(undefined, {}))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when the record has no key field', () => {
          it('should throw an error', async () => {
            await expect(encStorage.write(COUNTRY, {}))
              .to.be.rejectedWith(StorageError, 'write() Validation Error: <Record>.key should be string but got undefined');
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
              const secrets = {
                secrets: [
                  {
                    secret: 'longAndStrongPassword',
                    version: 0,
                    isForCustomEncryption: true,
                  },
                ],
                currentVersion: 0,
              };

              const customEncConfigs = [{
                encrypt: (text) => Buffer.from(text).toString('base64'),
                decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
                version: 'customEncryption',
                isCurrent: true,
              }];

              const storage = await getDefaultStorage(true, false, () => secrets, customEncConfigs);

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

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('uS', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('Us', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('US', { key: '123' });
        });
      });
    });

    describe('read', () => {
      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.read(undefined, '')).to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.read(COUNTRY, undefined)).to.be.rejectedWith(StorageError, RECORD_KEY_ERROR_MESSAGE);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await encStorage.encryptPayload({ ...EMPTY_RECORD, ...testCase });
                nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
                  .reply(200, encryptedPayload);

                const { record } = await encStorage.read(COUNTRY, testCase.key);
                expect(record).to.own.include(testCase);
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
              const secrets = {
                secrets: [
                  {
                    secret: 'longAndStrongPassword',
                    version: 0,
                    isForCustomEncryption: true,
                  },
                ],
                currentVersion: 0,
              };

              const customEncConfigs = [{
                encrypt: (text) => Buffer.from(text).toString('base64'),
                decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
                version: 'customEncryption',
                isCurrent: true,
              }];

              const storage = await getDefaultStorage(true, false, () => secrets, customEncConfigs);

              const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, ...testCase });
              nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.key)
                .reply(200, encryptedPayload);

              const { record } = await storage.read(COUNTRY, testCase.key);
              expect(record).to.own.include(testCase);
            });
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload({ ...EMPTY_RECORD, ...TEST_RECORDS[0] });
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
            const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, key });

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(keyNormalized))
              .reply(200, encryptedPayload);

            await storage.read(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });

          it('should return record with original keys', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, key });
            nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(keyNormalized))
              .reply(200, encryptedPayload);

            const { record } = await storage.read(COUNTRY, key);
            expect(record.key).to.equal(key);
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, key });
            expect(encryptedPayload.key).to.equal(storage.createKeyHash(key));

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(key))
              .reply(200, encryptedPayload);

            const { record } = await storage.read(COUNTRY, key);
            expect(record.key).to.equal(key);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const key = '123';
          const storage = await getDefaultStorage();
          const encryptedPayload = await storage.encryptPayload({ ...EMPTY_RECORD, key });

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(key)).reply(200, encryptedPayload);
          await storage.read('uS', key);

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(key)).reply(200, encryptedPayload);
          await storage.read('Us', key);

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(key)).reply(200, encryptedPayload);
          await storage.read('US', key);
        });
      });
    });

    describe('delete', () => {
      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.delete(undefined, '')).to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            await expect(encStorage.delete(COUNTRY, undefined)).to.be.rejectedWith(StorageError, RECORD_KEY_ERROR_MESSAGE);
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
              .reply(200, { success: true });

            await storage.delete(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, storage.createKeyHash(key))
              .reply(200, { success: true });

            await storage.delete(COUNTRY, key);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const key = '123';
          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(key)).reply(200, {});
          await storage.delete('uS', key);

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(key)).reply(200, {});
          await storage.delete('Us', key);

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(key)).reply(200, {});
          await storage.delete('US', key);
        });
      });
    });

    describe('find', () => {
      const keys = ['key', 'key2', 'key3', 'profile_key'];

      describe('arguments validation', () => {
        describe('country validation', () => {
          it('should throw an error if country is not a string', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            await Promise.all(wrongCountries.map((country) => expect(encStorage.find(country))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });

        describe('filter validation', () => {
          it('should throw an error when filter is undefined', async () => {
            await expect(encStorage.find(COUNTRY, undefined, { }))
              .to.be.rejectedWith(StorageError);
          });

          it('should throw an error when filter has wrong format', async () => Promise.all(
            [
              false,
              '',
              1,
              [],
              () => 1,
              { aa: true },
              { aa: () => 1 },
              { aaa1: { $not: () => 1 } },
              { aaa1: { cccccc: 1 } },
              { aaa1: { $not: { $not: 1 } } },
              { aaa3: { $gt: 'ccc' } },
              { aaa3: { $gt: [] } },
            ].map((filter) => expect(encStorage.find(COUNTRY, filter))
              .to.be.rejectedWith(StorageError, 'FindFilter', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when filter has correct format', async () => Promise.all(
            [
              {},
              { aa: 1 },
              { aa: [] },
              { aa: [1] },
              { aa: { $not: 1 } },
              { aa: { $not: [1] } },
              { aa: { $gt: 1 } },
              { aa: { $lt: 1 } },
              { aa: '' },
              { aa: [''] },
            ].map((filter) => expect(encStorage.find(COUNTRY, filter))
              .not.to.be.rejectedWith(StorageError, '<FindFilter>', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));
        });

        describe('options validation', () => {
          it('should throw an error when options.limit is not positive integer or greater than MAX_LIMIT', async () => {
            nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
            nockEndpoint(POPAPI_HOST, 'find', COUNTRY, 'test').reply(200, getDefaultFindResponse(0, []));

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            await Promise.all(nonPositiveLimits.map((limit) => expect(encStorage.find(COUNTRY, {}, { limit }))
              .to.be.rejectedWith(StorageError, LIMIT_ERROR_MESSAGE_INT)));

            await expect(encStorage.find(COUNTRY, {}, { limit: MAX_LIMIT + 1 }))
              .to.be.rejectedWith(StorageError, LIMIT_ERROR_MESSAGE_MAX);

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

        it('should hash filter with empty strings', async () => {
          const filter = { key2: { $not: '' } };
          const hashedFilter = { key2: { $not: encStorage.createKeyHash(filter.key2.$not) } };

          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(0, []));

          const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        keys.forEach((key) => {
          it(`should hash ${key} in filters request and decrypt returned data correctly`, async () => {
            const filter = { [key]: TEST_RECORDS[4][key] };
            const hashedFilter = { [key]: encStorage.createKeyHash(filter[key]) };
            let requestedFilter;

            const resultRecords = TEST_RECORDS.filter((rec) => rec[key] === filter[key]).map((record) => ({ ...EMPTY_RECORD, ...record }));
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
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage.encryptPayload({ ...EMPTY_RECORD, ...record })));

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(storedData.length, storedData));

          const { records } = await noEncStorage.find(COUNTRY, { key: 'key1' });

          records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
        });

        it('should not throw if some records cannot be decrypted', async () => {
          const encryptedData = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload({ ...EMPTY_RECORD, ...record })));
          const unsupportedData = {
            ...EMPTY_RECORD,
            country: 'us',
            key: 'somekey',
            body: '2:unsupported data',
            version: 0,
          };
          const data = [...encryptedData, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data.length, data));

          const result = await encStorage.find('us', {});

          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });

          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          expect(result.errors[0].error.message).to.equal('Invalid IV length');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
        });

        it('find() in non-encrypted mode should not throw error if some records are encrypted', async () => {
          const nonEncryptedData = await Promise.all(
            TEST_RECORDS.map((record) => noEncStorage.encryptPayload({ ...EMPTY_RECORD, ...record })),
          );
          const unsupportedData = {
            ...EMPTY_RECORD,
            country: 'us',
            key: 'somekey',
            body: '2:unsupported data',
            version: 0,
          };
          const data = [...nonEncryptedData, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data.length, data));

          const result = await noEncStorage.find('us', {});


          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });
          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          expect(result.errors[0].error.message).to.equal('No secretKeyAccessor provided. Cannot decrypt encrypted data');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
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

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse(0, []));
          await storage.find('uS', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse(0, []));
          await storage.find('Us', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse(0, []));
          await storage.find('US', { key: '123' });
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

        const [bodyObj] = await Promise.all([getNockedRequestBodyObject(popAPI), encStorage.findOne(COUNTRY, { key: '' }, { limit: 100, offset: 0 })]);
        expect(bodyObj.options).to.deep.equal({ limit: 1, offset: 0 });
      });

      it('should return null when no results found', async () => {
        nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse(0, []));

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key3', async () => {
        const filter = { key3: TEST_RECORDS[4].key3 };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key3 === filter.key3);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload({ ...EMPTY_RECORD, ...record })));

        nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, getDefaultFindResponse(encryptedRecords.length, encryptedRecords));
        const result = await encStorage.findOne(COUNTRY, filter);
        expect(result.record).to.own.include(TEST_RECORDS[4]);
      });
    });

    describe('migrate', () => {
      describe('when encryption disabled', () => {
        it('should throw an error', async () => {
          await expect(noEncStorage.migrate(COUNTRY, 10)).to.be.rejectedWith(StorageError, 'Migration not supported when encryption is off');
        });
      });

      describe('when encryption enabled', () => {
        it('should migrate data from old secret to new', async () => {
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload({ ...EMPTY_RECORD, ...record })));
          const migrateResult = { meta: { migrated: encryptedRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };

          const encStorage2 = await getDefaultStorage(true, false, () => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          }));

          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse(encryptedRecords.length, encryptedRecords));
          const popAPIBatchWrite = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200, 'OK');

          const result = await encStorage2.migrate(COUNTRY, encryptedRecords.length);
          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });

      it('should throw error if cannot decrypt any record', async () => {
        const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload({ ...EMPTY_RECORD, ...record })));

        const oldSecret = { secret: SECRET_KEY, version: 1 };
        const newSecret = { secret: 'keykey', version: 2 };

        const encStorage2 = await getDefaultStorage(true, false, () => ({
          secrets: [oldSecret, newSecret],
          currentVersion: newSecret.version,
        }));

        nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse(encryptedRecords.length, encryptedRecords));

        await expect(encStorage2.migrate(COUNTRY, encryptedRecords.length))
          .to.be.rejectedWith(StorageError, 'Secret not found for version 0');
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
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });
      });

      describe('should validate records', () => {
        const errorCases = [{
          name: 'when the records has wrong type',
          arg: 'recordzzz',
          error: 'batchWrite() Validation Error: You must pass non-empty array of records',
        },
        {
          name: 'when the records is empty array',
          arg: [],
          error: 'batchWrite() Validation Error: You must pass non-empty array of records',
        },
        {
          name: 'when any record has no key field',
          arg: [{}],
          error: 'batchWrite() Validation Error: <RecordsArray>.0.key should be string but got undefined',
        },
        {
          name: 'when any record from 4 has no key field',
          arg: [{ key: '1' }, { key: '1' }, { key: '1' }, {}],
          error: 'batchWrite() Validation Error: <RecordsArray>.3.key should be string but got undefined',
        },
        {
          name: 'when any record has wrong format',
          arg: [{ key: '1', key2: 41234512 }],
          error: 'batchWrite() Validation Error: <RecordsArray>.0.key2 should be (string | null) but got 41234512',
        }];

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            await expect(encStorage.batchWrite(COUNTRY, errCase.arg)).to.be.rejectedWith(StorageError, errCase.error);
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
              decryptedRecords.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
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

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('uS', [{ key: '123' }]);

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('Us', [{ key: '123' }]);

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('US', [{ key: '123' }]);
        });
      });
    });

    describe('compatibility', async () => {
      const storage = await createStorage({
        apiKey: 'string',
        environmentId: 'InCountry',
        endpoint: POPAPI_HOST,
        encrypt: true,
        normalizeKeys: false,
        getSecrets: defaultGetSecretsCallback,
        logger: LOGGER_STUB,
      });

      context('with prepared payload', () => {
        it('should encrypt and match result', async () => {
          const encrypted = await storage.encryptPayload(PREPARED_PAYLOAD_DECRYPTED);
          expect(_.omit(encrypted, 'body')).to.deep.equal(_.omit(PREPARED_PAYLOAD_STORED, 'body'));
        });

        it('should decrypt and match result', async () => {
          const decrypted = await storage.decryptPayload(PREPARED_PAYLOAD_STORED);
          expect(_.omit(decrypted, 'version')).to.deep.equal(PREPARED_PAYLOAD_DECRYPTED);
        });
      });


      context('with different envs', () => {
        it('should encrypt differently', async () => {
          const storage1 = await createStorage({
            apiKey: 'string',
            environmentId: 'env1',
            endpoint: POPAPI_HOST,
            encrypt: true,
            normalizeKeys: false,
            getSecrets: defaultGetSecretsCallback,
            logger: LOGGER_STUB,
          });

          const storage2 = await createStorage({
            apiKey: 'string',
            environmentId: 'env2',
            endpoint: POPAPI_HOST,
            encrypt: true,
            normalizeKeys: false,
            getSecrets: defaultGetSecretsCallback,
            logger: LOGGER_STUB,
          });

          const encrypted1 = await storage1.encryptPayload(PREPARED_PAYLOAD_DECRYPTED);
          const encrypted2 = await storage2.encryptPayload(PREPARED_PAYLOAD_DECRYPTED);
          const keys = ['key', 'key2', 'key3', 'profile_key'];
          keys.forEach((key) => {
            expect(encrypted1[key]).to.not.equal(encrypted2[key]);
          });
        });
      });
    });
  });
});
