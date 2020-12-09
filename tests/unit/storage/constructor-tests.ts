import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage } from '../../../src/storage';
import { CountriesCache } from '../../../src/countries-cache';
import { SecretsValidationError, StorageConfigValidationError } from '../../../src/errors';


chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;

describe('Storage', () => {
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  beforeEach(() => {
    clientId = process.env.INC_CLIENT_ID;
    clientSecret = process.env.INC_CLIENT_SECRET;
    delete process.env.INC_CLIENT_ID;
    delete process.env.INC_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env.INC_CLIENT_ID = clientId;
    process.env.INC_CLIENT_SECRET = clientSecret;
  });

  describe('interface methods', () => {
    describe('constructor arguments check', () => {
      describe('options', () => {
        describe('endpoint', () => {
          let envApiKey: string | undefined;
          let envEnvironmentId: string | undefined;

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
              await expect(createStorage(options as any))
                .to.be.rejectedWith(StorageConfigValidationError, `Storage.constructor() Validation Error: <StorageOptions>.endpoint should be string but got ${options.endpoint}`);
            }));
          });

          it('should not throw error if endpoint missing', async () => {
            process.env.INC_API_KEY = 'apiKey';
            process.env.INC_ENVIRONMENT_ID = 'envId';
            await expect(createStorage({ encrypt: false })).not.to.be.rejected;
          });
        });

        describe('apiKey', () => {
          let envApiKey: string | undefined;

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
                .to.be.rejectedWith(StorageConfigValidationError, 'Please pass apiKey in options or set INC_API_KEY env var');
            }));

            await expect(createStorage({
              apiKey: 'apiKey',
              environmentId: 'envId',
              encrypt: false,
            })).not.to.be.rejected;

            process.env.INC_API_KEY = 'apiKey';

            await expect(createStorage({ environmentId: 'envId', encrypt: false })).not.to.be.rejected;
          });
        });

        describe('environmentId', () => {
          let envEnvironmentId: string | undefined;

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
                .to.be.rejectedWith(StorageConfigValidationError, 'Please pass environmentId in options or set INC_ENVIRONMENT_ID env var');
            }));

            await expect(createStorage({
              apiKey: 'apiKey',
              environmentId: 'envId',
              encrypt: false,

            })).not.to.be.rejected;

            process.env.INC_ENVIRONMENT_ID = 'envId';

            await expect(createStorage({ apiKey: 'apiKey', encrypt: false })).not.to.be.rejected;
          });
        });

        describe('oauth', () => {
          const baseOptions = {
            environmentId: 'envId', encrypt: false,
          };

          describe('clientId', () => {
            let envApiKey: string | undefined;

            beforeEach(() => {
              envApiKey = process.env.INC_API_KEY;
              delete process.env.INC_API_KEY;
            });

            afterEach(() => {
              process.env.INC_API_KEY = envApiKey;
            });

            it('should be provided via either options or environment variable', async () => {
              await Promise.all([{ ...baseOptions, oauth: {} }, { ...baseOptions, oauth: { clientId: undefined } }].map(async (options) => {
                await expect(createStorage(options))
                  .to.be.rejectedWith(StorageConfigValidationError, 'Please pass apiKey in options or set INC_API_KEY env var');
              }));
              process.env.INC_CLIENT_SECRET = 'clientSecret';
              await expect(createStorage(baseOptions))
                .to.be.rejectedWith(StorageConfigValidationError, 'Please pass clientId in options or set INC_CLIENT_ID env var');
              delete process.env.INC_CLIENT_SECRET;

              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: 'clientSecret' } })).not.to.be.rejected;
              process.env.INC_CLIENT_ID = 'clientId';
              await expect(createStorage({ ...baseOptions, oauth: { clientSecret: 'clientSecret' } })).not.to.be.rejected;
            });
          });

          describe('clientSecret', () => {
            it('should be provided via either options or environment variable', async () => {
              process.env.INC_CLIENT_ID = 'clientId';
              await expect(createStorage(baseOptions))
                .to.be.rejectedWith(StorageConfigValidationError, 'Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
              delete process.env.INC_CLIENT_ID;

              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: undefined } }))
                .to.be.rejectedWith(StorageConfigValidationError, 'Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: 'clientSecret' } })).not.to.be.rejected;
              process.env.INC_CLIENT_SECRET = 'clientSecret';
              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId' } })).not.to.be.rejected;
              process.env.INC_CLIENT_ID = 'clientId';
              await expect(createStorage(baseOptions)).not.to.be.rejected;
            });
          });

          describe('authEndpoints', () => {
            it('should be an object', async () => {
              const invalidAuthEndpoints = [
                null,
                'str',
                123,
                [],
                () => {},
              ];
              await Promise.all(invalidAuthEndpoints.map(async (authEndpoints) => {
                const options = {
                  environmentId: 'envId',
                  encrypt: false,
                  oauth: { clientId: 'clientId', clientSecret: 'clientSecret', authEndpoints },
                };
                const errorMsg = 'Storage.constructor() Validation Error: authEndpoints should be an object containing "default" key';
                // @ts-ignore
                await expect(createStorage(options))
                  .to.be.rejectedWith(StorageConfigValidationError, errorMsg);
              }));
            });

            it('should be an object with string values and the default key', async () => {
              const errStringValue = 'Storage.constructor() Validation Error: authEndpoints values should be a string';
              const errObjectFormat = 'Storage.constructor() Validation Error: authEndpoints should be an object containing "default" key';
              const invalidAuthEndpoints = [
                [{}, errObjectFormat],
                [{ key: 'value' }, errObjectFormat],
                [{ default: null }, errStringValue],
                [{ default: undefined }, errStringValue],
                [{ default: 123 }, errStringValue],
                [{ default: [] }, errStringValue],
                [{ default: {} }, errStringValue],
                [{ default: () => {} }, errStringValue],
                [{ key: 123, default: '' }, errStringValue],
              ];
              await Promise.all(invalidAuthEndpoints.map(async ([authEndpoints, err]) => {
                const options = {
                  environmentId: 'envId',
                  encrypt: false,
                  oauth: { clientId: 'clientId', clientSecret: 'clientSecret', authEndpoints },
                };
                // @ts-ignore
                await expect(createStorage(options))
                  .to.be.rejectedWith(StorageConfigValidationError, err);
              }));

              await expect(createStorage({
                environmentId: 'envId',
                encrypt: false,
                oauth: {
                  clientId: 'clientId',
                  clientSecret: 'clientSecret',
                  authEndpoints: {
                    default: 'http://localhost/path',
                    apac: 'http://localhost/path1',
                    emea: 'http://127.0.0.1/path2',
                  },
                },
              })).not.to.be.rejected;
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
          )).to.be.rejectedWith(StorageConfigValidationError, 'Provide callback function for secretData');
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
              getSecrets: () => {},
            },
          )).to.be.rejectedWith(SecretsValidationError, '<SecretsData> should be SecretsData but got undefined');

          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              getSecrets: () => ({ secrets: [{ version: -1, secret: '' }], currentVersion: -1 }),
            },
          )).to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.version should be NonNegativeInt but got -1');

          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              getSecrets: () => ({ secrets: [{ version: 1, secret: true }], currentVersion: 1 }),
            },
          )).to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.secret should be string but got true');
        });

        it('should throw an error if not a getSecrets callback is provided', async () => {
          await expect(createStorage(
            {
              apiKey: 'API_KEY',
              environmentId: 'ENVIRONMENT_ID',
              endpoint: 'URL',
              // @ts-ignore
              getSecrets: {},
            },
          )).to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.getSecrets should be Function but got {}');
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', async () => {
          // @ts-ignore
          const expectStorageConstructorThrowsError = async (wrongLogger) => expect(createStorage({ encrypt: false, logger: wrongLogger }))
            .to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.logger');


          const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
          await Promise.all(wrongLoggers.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });

      describe('countriesCache', () => {
        it('should throw an error if provided countriesCache is not object or is not instance of CountriesCache', async () => {
          // @ts-ignore
          const expectStorageConstructorThrowsError = async (wrongCache) => expect(createStorage({ encrypt: false, countriesCache: wrongCache }))
            .to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.countriesCache should be CountriesCache');

          const wrongCaches = [null, 'foo', 42, () => null, {}, { foo: 'bar' }, new SecretsValidationError('foo', 'bar')];
          await Promise.all(wrongCaches.map((item) => expectStorageConstructorThrowsError(item)));
        });

        it('should not throw an error if provided countriesCache is instance of CountriesCache', async () => {
          await expect(createStorage({ encrypt: false, countriesCache: new CountriesCache() }))
            .to.be.not.rejected;
        });
      });

      describe('endpointMask', () => {
        it('should throw an error if provided endpointMask is not string', async () => {
          const expectStorageConstructorThrowsError = async (wrongMask: string) => expect(createStorage({ encrypt: false, endpointMask: wrongMask }))
            .to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.endpointMask should be string but got');


          const wrongEndpointMasks = [42, () => null, {}, [], null];
          // @ts-ignore
          await Promise.all(wrongEndpointMasks.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });


      describe('httpOptions', () => {
        it('should throw an error if provided httpOptions are not correct object', async () => {
          const expectStorageConstructorThrowsError = async (httpOptions: any) => expect(createStorage({ encrypt: false, httpOptions }))
            .to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.httpOptions');

          const wrongOptions = [42, () => null, [], null, { timeout: '100' }, { timeout: -1 }];
          // @ts-ignore
          await Promise.all(wrongOptions.map((item) => expectStorageConstructorThrowsError(item)));
        });

        it('should not throw an error if  httpOptions are not provided', async () => {
          const expectStorageConstructorNotThrowsError = async (httpOptions: any) => expect(createStorage({ encrypt: false, httpOptions }))
            .to.not.be.rejected;

          const wrongOptions = [undefined, {}];
          await Promise.all(wrongOptions.map((item) => expectStorageConstructorNotThrowsError(item)));
        });
      });

      describe('countriesEndpoint', () => {
        it('should throw an error if provided countriesEndpoint is not string', async () => {
          // @ts-ignore
          const expectStorageConstructorThrowsError = async (countriesEndpoint: string) => expect(createStorage({ encrypt: false, countriesEndpoint }))
            .to.be.rejectedWith(StorageConfigValidationError, 'Storage.constructor() Validation Error: <StorageOptions>.countriesEndpoint should be string but got');


          const wrongCountriesEndpoint = [42, () => null, {}, [], null];
          // @ts-ignore
          await Promise.all(wrongCountriesEndpoint.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });
    });
  });
});
