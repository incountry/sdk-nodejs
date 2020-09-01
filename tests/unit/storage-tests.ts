import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import { identity } from 'fp-ts/lib/function';
import * as _ from 'lodash';
import {
  createStorage, Storage, WriteResult, KEYS_TO_HASH, FIND_LIMIT,
} from '../../src/storage';
import { StorageServerError, StorageClientError, StorageError } from '../../src/errors';
import { CountriesCache } from '../../src/countries-cache';
import {
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
  nockEndpoint,
} from '../test-helpers/popapi-nock';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../src/validation/country-code';
import { RECORD_KEY_ERROR_MESSAGE } from '../../src/validation/record-key';
import {
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
  CustomEncryptionConfig,
} from '../../src/validation/custom-encryption-configs';
import { MAX_LIMIT, LIMIT_ERROR_MESSAGE_INT, LIMIT_ERROR_MESSAGE_MAX } from '../../src/validation/limit';
import { StorageRecordData } from '../../src/validation/storage-record-data';
import { Int } from '../../src/validation/utils';
import { ApiRecord } from '../../src/validation/api/api-record';
import { FindResponse } from '../../src/validation/api/find-response';
import { ApiRecordData } from '../../src/validation/api/api-record-data';
import { filterFromStorageDataKeys } from '../../src/validation/api/find-filter';
import { INVALID_REQUEST_OPTIONS, VALID_REQUEST_OPTIONS } from './validation/request-options';
import { INVALID_FIND_FILTER, VALID_FIND_FILTER } from './validation/find-filter-test';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect, assert } = chai;

const noop = () => {};

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
const sdkVersionRegExp = /^SDK-Node\.js\/\d+\.\d+\.\d+/;

const EMPTY_API_RECORD = {
  body: '',
  version: 0 as Int,
  created_at: new Date(),
  updated_at: new Date(),
  is_encrypted: false,
  precommit_body: null,
  key1: null,
  key2: null,
  key3: null,
  key4: null,
  key5: null,
  key6: null,
  key7: null,
  key8: null,
  key9: null,
  key10: null,
  service_key1: null,
  service_key2: null,
  profile_key: null,
  range_key1: null,
  range_key2: null,
  range_key3: null,
  range_key4: null,
  range_key5: null,
  range_key6: null,
  range_key7: null,
  range_key8: null,
  range_key9: null,
  range_key10: null,
};

const TEST_RECORDS = [
  {
    recordKey: uuid(),
  },
  {
    recordKey: uuid(),
    body: 'test',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    key4: 'key4',
    key5: 'key5',
    key6: 'key6',
    key7: 'key7',
    key8: 'key8',
    key9: 'key9',
    key10: 'key10',
    serviceKey1: 'serviceKey1',
    serviceKey2: 'serviceKey2',
    profileKey: 'profile_key',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    rangeKey1: 1 as Int,
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    serviceKey1: 'service_key1',
    rangeKey1: 1 as Int,
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    serviceKey1: 'service_key1',
    rangeKey1: 1 as Int,
    precommitBody: 'test',
  },
];


const PREPARED_PAYLOAD = [
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      body: '2:IGJNCmV+RXZydaPxDjjhZ80/6aZ2vcEUZ2GuOzKgVSSdM6gYf5RPgFbyLqv+7ihz0CpYFQQWf9xkIyD/u3VYky8dWLq+NXcE2xYL4/U7LqUZmJPQzgcQCABYQ/8vOvUEcrfOAwzGjR6etTp1ki+79JmCEZFSNqcDP1GZXNLFdLoSUp1X2wVlH9ukhJ4jrE0cKDrpJllswRSOz0BhS8PA/73KNKwo718t7fPWpUm7RkyILwYTd/LpPvpXMS6JypEns8fviOpbCLQPpZNBe6zpwbFf3C0qElHlbCyPbDyUiMzVKOwWlYFpozFcRyWegjJ42T8v52+GuRY5',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      version: 0 as Int,
    },
    dec: {
      recordKey: 'InCountryKey',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      profileKey: 'InCountryPK',
      body: '{"data": "InCountryBody"}',
      rangeKey1: 100500 as Int,
    },
  },
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      range_key2: 10050 as Int,
      range_key3: 1005 as Int,
      range_key4: 100 as Int,
      range_key5: 10 as Int,
      range_key6: 1 as Int,
      range_key7: 10 as Int,
      range_key8: 100 as Int,
      range_key9: 1005 as Int,
      range_key10: 10050 as Int,
      service_key1: 'b2d95d1ccfeb1a17c99b74685f7fd4c33647b97cb0559c267a4afcd6f649f3a8',
      service_key2: '9bbc39b2617cbd9fc0290f93c7bbd1772f1a2a45f48ae8dc1a9544d75159c7a2',
      key1: 'daf5914655dc36b7f6f31a97a05205106fdbd725e264235e9e8b31c66489e7ed',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      key4: '08a46eb74e0621208a41cf982b9da83e564a1d448997c5c912477ff79ec4c0e3',
      key5: 'cb86e1358566c9f6c1a52106b32a085b5f02aa8330d3f538ddf55cd599a320f7',
      key6: '5048f7bae5308ca05006ef63025d4243beddbf431f7eff43ac927e471656d1ed',
      key7: 'aa9e0b00099734cafeda1b13393422a381596dc3fd189ee598791fa95f46bce4',
      key8: '54933d4eb2e2d2c1e7ab9344e23a233ee9c537876929d5e265d45ae789b03f6c',
      key9: 'c0e91efa56683cf7f1f0f99b2791e4719e7f70018c6e3938ebaff5735d3c275f',
      key10: '9f54258b7136a70f61891f162243e11930d5cedb3ca89682bab9f28fbedda9b6',
      precommit_body: '2:iqFsqhqby5rX5YAsFnboXoMwSBX7b8JSybs6INJTSMNBSZIulv44hyYw2XlENtOWTCV1Sn1uzM4H4ekTy3vXhTyzbndWBdSWNXcT8mLUDZcByyGJhKunvuvr9B1Bk5GghNzuEvriVsV08LEg',
      body: '2:0Xxd0QYOXstTmrA1Erqm6F/jxt83IHFFHqJPf+QuMpwOObh+OaJ1hCjLLGi2GVnBXENQ5sIt92ayemBXr5JEY2CNUI9lp18gOim+aXveWH1FN8yk5HYqoSyOb5CkJHvp73+AaFmpzTJA3Zxy7z7rfZE2ByCwGtX454iY35jQcUGr1Zpo3m4BX2Y8Rc+RYvAO0J+1y6iDnaNk228d0QwDK4VRISslct+vp7T+O/fnOuyTZzoy/2IoUuvHpkhGsKB2sA+elqCMHz64HGlbGL1OWMmChmQ4R3Ax+/ddzd3xorUQdyz0S1L0YoByE/vCAgGMCkXkQ7kSnqFsRLyJPK4tZWen+G7pt4SdLHoD60vh8QrGtPXVQe4P9HeNCwZXOyhpZbTKvHRXIzsmzGud7Z6rU4DGSBEoeWXcVKIgQ7H0sBCHFZ6ixsw0fb/ciw66HGS/06tyjrWyMsq7HsaOkL01bzaRM9SMeZZskHDGsi4fOvt498SvKF2VT28PMWH8h4Wj24q7o18Ms7NrhnkqDql11FsKLb/O6hcKo5c9GzsSkYN+7KoPwHcj+eWs0Odu4BL2xq7VJiIjCw+25pqlXSpyKV0QTUSXI31VTNoqRRMpBlM06n4SC6SidQfRiiWXqptJEhLA9g==',
      version: 0 as Int,
      is_encrypted: true,
    },
    dec: {
      recordKey: 'InCountryKey',
      body: '{"data": "InCountryBody"}',
      precommitBody: '{"test": "test"}',
      key1: 'InCountryKey1',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      key4: 'InCountryKey4',
      key5: 'InCountryKey5',
      key6: 'InCountryKey6',
      key7: 'InCountryKey7',
      key8: 'InCountryKey8',
      key9: 'InCountryKey9',
      key10: 'InCountryKey10',
      profileKey: 'InCountryPK',
      serviceKey1: 'service1',
      serviceKey2: 'service2',
      rangeKey1: 100500 as Int,
      rangeKey2: 10050 as Int,
      rangeKey3: 1005 as Int,
      rangeKey4: 100 as Int,
      rangeKey5: 10 as Int,
      rangeKey6: 1 as Int,
      rangeKey7: 10 as Int,
      rangeKey8: 100 as Int,
      rangeKey9: 1005 as Int,
      rangeKey10: 10050 as Int,
    },
  },
];


const LOGGER_STUB = () => ({ write: (a: string, b: string, c: any) => [a, b, c] });

const defaultGetSecretsCallback = () => SECRET_KEY;

const getDefaultStorage = async (encrypt = false, normalizeKeys = false, getSecrets: Function = defaultGetSecretsCallback, customEncConfigs?: CustomEncryptionConfig[]) => createStorage({
  apiKey: 'string',
  environmentId: 'string',
  endpoint: POPAPI_HOST,
  encrypt,
  normalizeKeys,
  getSecrets,
  logger: LOGGER_STUB(),
}, customEncConfigs);

const getDefaultFindResponse = (data: ApiRecord[] = [], limit = 100, offset = 0): FindResponse => ({
  meta: {
    total: data.length, count: data.length, limit, offset,
  },
  data,
});

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
    let encStorage: Storage;
    let noEncStorage: Storage;

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
                  .to.be.rejectedWith(StorageClientError, 'Please pass apiKey in options or set INC_API_KEY env var');
              }));
              process.env.INC_CLIENT_SECRET = 'clientSecret';
              await expect(createStorage(baseOptions))
                .to.be.rejectedWith(StorageClientError, 'Please pass clientId in options or set INC_CLIENT_ID env var');
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
                .to.be.rejectedWith(StorageClientError, 'Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
              delete process.env.INC_CLIENT_ID;

              await expect(createStorage({ ...baseOptions, oauth: { clientId: 'clientId', clientSecret: undefined } }))
                .to.be.rejectedWith(StorageClientError, 'Please pass clientSecret in options or set INC_CLIENT_SECRET env var');
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
                await expect(createStorage(options)).to.be.rejectedWith(StorageClientError, errorMsg);
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
                await expect(createStorage(options)).to.be.rejectedWith(StorageClientError, err);
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
              getSecrets: () => {},
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
              // @ts-ignore
              getSecrets: {},
            },
          )).to.be.rejectedWith(StorageError, 'getSecrets should be Function');
        });
      });

      describe('logger', () => {
        it('should throw an error if provided logger is not object or has no "write" method or is not a function', async () => {
          // @ts-ignore
          const expectStorageConstructorThrowsError = async (wrongLogger) => expect(createStorage({ encrypt: false, logger: wrongLogger }))
            .to.be.rejectedWith(StorageError, 'logger');


          const wrongLoggers = [42, () => null, {}, { write: 'write' }, { write: {} }];
          await Promise.all(wrongLoggers.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });

      describe('endpointMask', () => {
        it('should throw an error if provided endpointMask is not string', async () => {
          const expectStorageConstructorThrowsError = async (wrongMask: string) => expect(createStorage({ encrypt: false, endpointMask: wrongMask }))
            .to.be.rejectedWith(StorageError, 'endpointMask');


          const wrongEndpointMasks = [42, () => null, {}, [], null];
          // @ts-ignore
          await Promise.all(wrongEndpointMasks.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });


      describe('httpOptions', () => {
        it('should throw an error if provided httpOptions are not correct object', async () => {
          const expectStorageConstructorThrowsError = async (wrongOptions: any) => expect(createStorage({ encrypt: false, httpOptions: wrongOptions }))
            .to.be.rejectedWith(StorageError, 'httpOptions');

          const wrongOptions = [42, () => null, [], null, { timeout: '100' }, { timeout: -1 }];
          // @ts-ignore
          await Promise.all(wrongOptions.map((item) => expectStorageConstructorThrowsError(item)));
        });

        it('should not throw an error if  httpOptions are not provided', async () => {
          const expectStorageConstructorNotThrowsError = async (wrongOptions: any) => expect(createStorage({ encrypt: false, httpOptions: wrongOptions }))
            .to.not.be.rejectedWith(StorageError);

          const wrongOptions = [undefined, {}];
          await Promise.all(wrongOptions.map((item) => expectStorageConstructorNotThrowsError(item)));
        });
      });

      describe('countriesEndpoint', () => {
        it('should throw an error if provided countriesEndpoint is not string', async () => {
          // @ts-ignore
          const expectStorageConstructorThrowsError = async (wrongCountriesEndpoint: string) => expect(createStorage({ encrypt: false, countriesEndpoint: wrongCountriesEndpoint }))
            .to.be.rejectedWith(StorageError, 'countriesEndpoint');


          const wrongCountriesEndpoint = [42, () => null, {}, [], null];
          // @ts-ignore
          await Promise.all(wrongCountriesEndpoint.map((item) => expectStorageConstructorThrowsError(item)));
        });
      });
    });

    describe('setLogger', () => {
      let storage: Storage;

      beforeEach(async () => {
        storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
      });

      it('should throw an error if called with falsy argument', () => {
        [null, undefined, false].forEach((logger) => {
          // @ts-ignore
          expect(() => storage.setLogger(logger)).to.throw(StorageError, '<Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger is not object or has no "write" method', () => {
        const wrongLoggers = [42, () => null];
        wrongLoggers.forEach((logger) => {
          // @ts-ignore
          expect(() => storage.setLogger(logger))
            .to.throw(StorageError, '<Logger> should be { write: Function }');
        });
      });

      it('should throw an error if provided logger\'s "write" method is not a function', () => {
        const wrongLoggers = [{}, { write: 'write' }, { write: {} }];
        wrongLoggers.forEach((logger) => {
          // @ts-ignore
          expect(() => storage.setLogger(logger))
            .to.throw(StorageError, '<Logger>.write should be Function');
        });
      });
    });

    describe('setCountriesCache', () => {
      it('should throw an error if not instance of CountriesCache was passed as argument', async () => {
        const storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
        const wrongCountriesCaches = [null, undefined, false, {}];
        wrongCountriesCaches.forEach((item) => {
          // @ts-ignore
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
          logger: LOGGER_STUB(),
        };

        const customEncryptionConfigs = [{ encrypt: () => { }, decrypt: () => { }, version: '' }];

        // @ts-ignore
        await expect(createStorage(options, customEncryptionConfigs))
          .to.be.rejectedWith(StorageClientError, 'Cannot use custom encryption when encryption is off');
      });

      it('should throw an error if configs object is malformed', () => Promise.all(['', {}, () => { }]
        .map(async (configs) => {
          const options = {
            apiKey: 'string',
            environmentId: 'string',
            endpoint: POPAPI_HOST,
            logger: LOGGER_STUB(),
            getSecrets: () => '',
          };

          // @ts-ignore
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
          logger: LOGGER_STUB(),
          getSecrets: () => '',
        };

        // @ts-ignore
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
          logger: LOGGER_STUB(),
          getSecrets: () => '',
        };

        // @ts-ignore
        await expect(createStorage(options, configs))
          .to.be.rejectedWith(CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
      });
    });

    describe('write', () => {
      let popAPI: nock.Scope;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_HOST, 'write', COUNTRY).reply(200, 'OK');
      });

      describe('arguments validation', () => {
        describe('request options', () => {
          const recordData = { recordKey: '123' };

          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.write(COUNTRY, recordData, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.write(COUNTRY, recordData, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.write(COUNTRY, recordData))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.write(COUNTRY, recordData, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.write(undefined, {}))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when the record has no recordKey field', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.write(COUNTRY, {}))
              .to.be.rejectedWith(StorageError, 'write() Validation Error: <Record>.recordKey should be string but got undefined');
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

                  const [bodyObj, result] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
                  expect(_.omit(bodyObj, ['body', 'precommit_body'])).to.deep.equal(_.omit(encrypted, ['body', 'precommit_body']));
                  expect(bodyObj.body).to.match(opt.bodyRegExp);
                  expect(result.record).to.deep.equal(testCase);
                });

                it('should set "is_encrypted"', async () => {
                  const storage = opt.encrypted ? encStorage : noEncStorage;

                  const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
                  expect(bodyObj.is_encrypted).to.equal(opt.encrypted);
                });
              });
            });
          });
        });

        describe('when enabled', () => {
          it('should encrypt precommit_body', async () => {
            const data = {
              recordKey: '123',
              precommitBody: 'test',
            };

            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), encStorage.write(COUNTRY, data)]);
            expect(bodyObj.precommit_body).to.be.a('string');
            expect(bodyObj.precommit_body).to.not.equal(data.precommitBody);
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
                encrypt: (text: string) => Promise.resolve(Buffer.from(text).toString('base64')),
                decrypt: (encryptedData: string) => Promise.resolve(Buffer.from(encryptedData, 'base64').toString('utf-8')),
                version: 'customEncryption',
                isCurrent: true,
              }];

              const storage = await getDefaultStorage(true, false, () => secrets, customEncConfigs);

              const encryptedPayload = await storage.encryptPayload(testCase);

              const [bodyObj, result] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
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
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const record = { recordKey };
            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect((bodyObj as ApiRecordData).record_key).to.equal(storage.createKeyHash(recordKeyNormalized));
          });
        });


        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const record = { recordKey };
            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect((bodyObj as ApiRecordData).record_key).to.equal(storage.createKeyHash(recordKey));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('uS', { recordKey: '123' });

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('Us', { recordKey: '123' });

          nockEndpoint(POPAPI_HOST, 'write', country).reply(200, 'OK');
          await storage.write('US', { recordKey: '123' });
        });
      });

      describe('normalized errors', () => {
        it('should wrap any error into StorageError and add method info', async () => {
          nock(POPAPI_HOST);

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

          const recordKey = '123';

          const customEncConfigs = [{
            encrypt: () => Promise.reject(new Error('blabla')),
            decrypt: () => Promise.resolve(''),
            version: 'customEncryption',
            isCurrent: true,
          }];

          const storage = new Storage({ encrypt: true, getSecrets: () => secrets }, customEncConfigs);
          await expect(storage.write(COUNTRY, { ...EMPTY_API_RECORD, recordKey })).to.be.rejectedWith(StorageError, 'Storage.write()');
        });
      });
    });

    describe('read', () => {
      describe('arguments validation', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.read(undefined, '')).to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.read(COUNTRY, undefined)).to.be.rejectedWith(StorageError, RECORD_KEY_ERROR_MESSAGE);
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.read(COUNTRY, '123', requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.read(COUNTRY, '123', requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.read(COUNTRY, '123'))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.read(COUNTRY, '123', { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await encStorage.encryptPayload(testCase);
                nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.record_key)
                  .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

                const { record } = await encStorage.read(COUNTRY, testCase.recordKey);
                expect(record).to.own.include(testCase);
                expect(record.createdAt).to.be.a('date');
                expect(record.updatedAt).to.be.a('date');
              });
            });
          });
        });

        describe('when disabled', () => {
          it('should read a record', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await noEncStorage.encryptPayload(recordData);
            expect(encryptedPayload.body).to.match(/^pt:.+/);
            nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.record_key)
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await noEncStorage.read(COUNTRY, recordData.recordKey);
            expect(record).to.deep.include(recordData);
            expect(record.createdAt).to.be.a('date');
            expect(record.updatedAt).to.be.a('date');
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
                encrypt: (text: string) => Promise.resolve(Buffer.from(text).toString('base64')),
                decrypt: (encryptedData: string) => Promise.resolve(Buffer.from(encryptedData, 'base64').toString('utf-8')),
                version: 'customEncryption',
                isCurrent: true,
              }];

              const storage = await getDefaultStorage(true, false, () => secrets, customEncConfigs);

              const encryptedPayload = await storage.encryptPayload(testCase);
              nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.record_key)
                .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

              const { record } = await storage.read(COUNTRY, testCase.recordKey);
              expect(record).to.own.include(testCase);
            });
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, encryptedPayload.record_key)
            .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.read(COUNTRY, TEST_RECORDS[0].recordKey)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            await storage.read(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });

          it('should return record with original keys', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });
            nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await storage.read(COUNTRY, recordKey);
            expect(record.recordKey).to.equal(recordKey);
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });
            expect(encryptedPayload.record_key).to.equal(storage.createKeyHash(recordKey));

            const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, storage.createKeyHash(recordKey))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await storage.read(COUNTRY, recordKey);

            expect(record.recordKey).to.equal(recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const recordKey = '123';
          const storage = await getDefaultStorage();
          const encryptedPayload = await storage.encryptPayload({ recordKey });
          const response = { ...EMPTY_API_RECORD, ...encryptedPayload };

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('uS', recordKey);

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('Us', recordKey);

          nockEndpoint(POPAPI_HOST, 'read', country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('US', recordKey);
        });
      });
    });

    describe('delete', () => {
      describe('arguments validation', () => {
        describe('country', () => {
          it('should throw an error when no country provided', async () => {
            // @ts-ignore
            await expect(encStorage.delete(undefined, '')).to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('recordKey', () => {
          it('should throw an error when no key provided', async () => {
            // @ts-ignore
            await expect(encStorage.delete(COUNTRY, undefined)).to.be.rejectedWith(StorageError, RECORD_KEY_ERROR_MESSAGE);
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.delete(COUNTRY, '123', requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.delete(COUNTRY, '123', requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.delete(COUNTRY, '123'))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.delete(COUNTRY, '123', { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
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
              const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encryptedPayload.record_key).reply(200, { success: true });

              const result = await encStorage.delete(COUNTRY, testCase.recordKey);
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
          const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, encryptedPayload.record_key).reply(200, { success: true });

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.delete(COUNTRY, TEST_RECORDS[0].recordKey)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { success: true });

            await storage.delete(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, storage.createKeyHash(recordKey))
              .reply(200, { success: true });

            await storage.delete(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const record_key = '123';
          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('uS', record_key);

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('Us', record_key);

          nockEndpoint(POPAPI_HOST, 'delete', country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('US', record_key);
        });
      });
    });

    describe('find', () => {
      describe('arguments validation', () => {
        describe('country validation', () => {
          it('should throw an error if country is not a string', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.find(country))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });

        describe('filter validation', () => {
          it('should throw an error when filter has wrong format', async () => Promise.all(
            // @ts-ignore
            INVALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .to.be.rejectedWith(StorageError, 'FindFilter', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when filter has correct format', async () => Promise.all(
            // @ts-ignore
            VALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .not.to.be.rejectedWith(StorageError, '<FindFilter>', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when find filter is not provided', async () => {
            expect(encStorage.find(COUNTRY))
              .not.to.be.rejectedWith(StorageError, '<FindFilter>');
          });
        });

        describe('options validation', () => {
          it('should throw an error when options.limit is not positive integer or greater than MAX_LIMIT', async () => {
            nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
            nockEndpoint(POPAPI_HOST, 'find', COUNTRY, 'test').reply(200, getDefaultFindResponse());

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            // @ts-ignore
            await Promise.all(nonPositiveLimits.map((limit) => expect(encStorage.find(COUNTRY, {}, { limit }))
              .to.be.rejectedWith(StorageError, LIMIT_ERROR_MESSAGE_INT)));

            await expect(encStorage.find(COUNTRY, {}, { limit: MAX_LIMIT + 1 }))
              .to.be.rejectedWith(StorageError, LIMIT_ERROR_MESSAGE_MAX);

            await expect(encStorage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
          });

          it('should not throw an error when find options are not provided', async () => {
            expect(encStorage.find(COUNTRY, {}))
              .not.to.be.rejectedWith(StorageError, '<FindOptions>');
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.find(COUNTRY, {}, {}, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.find(COUNTRY, {}, {}, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.find(COUNTRY, {}, {}))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.find(COUNTRY, {}, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('encryption', () => {
        it('should hash filters regardless of enabled/disabled encryption', async () => {
          const filter = { recordKey: [uuid(), uuid()] };
          const hashedFilter = filterFromStorageDataKeys({ recordKey: filter.recordKey.map((el) => encStorage.createKeyHash(el)) });

          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .times(2)
            .reply(200, getDefaultFindResponse());

          let [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), noEncStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        it('should hash filter with empty strings', async () => {
          const filter = { key2: { $not: '' } };
          const hashedFilter = { key2: { $not: encStorage.createKeyHash(filter.key2.$not) } };

          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse());

          const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        type KEY =
          | 'recordKey'
          | 'key1'
          | 'key2'
          | 'key3'
          | 'key4'
          | 'key5'
          | 'key6'
          | 'key7'
          | 'key8'
          | 'key9'
          | 'key10'
          | 'serviceKey1'
          | 'serviceKey2'
          | 'profileKey';

        const keys: KEY[] = [
          'recordKey',
          'key1',
          'key2',
          'key3',
          'key4',
          'key5',
          'key6',
          'key7',
          'key8',
          'key9',
          'key10',
          'serviceKey1',
          'serviceKey2',
          'profileKey',
        ];

        keys.forEach((key) => {
          it(`should hash ${key} in filters request and decrypt returned data correctly`, async () => {
            const filter = { [key]: TEST_RECORDS[4][key] as string };
            const hashedFilter = { [key]: encStorage.createKeyHash(filter[key]) };
            let requestedFilter;

            const resultRecords = TEST_RECORDS.filter((rec) => rec[key] === filter[key]);
            const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));
            const apiRecords = encryptedRecords.map((record) => ({
              ...EMPTY_API_RECORD,
              ...record,
              body: record.body || '',
              is_encrypted: true,
            }));

            nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
              .reply(200, (_uri, requestBody: any) => {
                requestedFilter = requestBody.filter;
                return getDefaultFindResponse(apiRecords);
              });

            const result = await encStorage.find(COUNTRY, filter, {});

            expect(result.records.map((record) => record.recordKey)).to.deep.equal(resultRecords.map((record) => record.recordKey));
            result.records.forEach((record) => {
              const resultRecord = resultRecords.find((resRecord) => resRecord.recordKey === record.recordKey);
              expect(record).to.include(resultRecord);
            });

            expect(requestedFilter).to.deep.equal(filterFromStorageDataKeys(hashedFilter));
          });
        });

        it('should decode not encrypted records correctly', async () => {
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)));
          const apiRecords = storedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(apiRecords));

          const { records } = await noEncStorage.find(COUNTRY, { key: 'key1' });

          records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
        });

        it('should not throw if some records cannot be decrypted', async () => {
          const encryptedData = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const apiRecords = encryptedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          const unsupportedData = {
            ...EMPTY_API_RECORD,
            country: 'us',
            record_key: 'somekey',
            body: '2:unsupported data',
            version: 0 as Int,
          };
          const data = [...apiRecords, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data));

          const result = await encStorage.find('us', {});

          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });

          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          if (result.errors === undefined) {
            throw assert.fail('FindResult should have errors array');
          }
          expect(result.errors[0].error.message).to.equal('Invalid IV length');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
        });

        it('find() in non-encrypted mode should not throw error if some records are encrypted', async () => {
          const nonEncryptedData = await Promise.all(
            TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)),
          );
          const apiRecords = nonEncryptedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          const unsupportedData = {
            ...EMPTY_API_RECORD,
            record_key: 'unsupported',
            body: '2:unsupported data',
          };

          const data = [...apiRecords, unsupportedData];

          nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(data));

          const result = await noEncStorage.find('us', {});

          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });
          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          if (result.errors === undefined) {
            throw assert.fail('FindResult should have errors array');
          }
          expect(result.errors[0].error.message).to.equal('No secretKeyAccessor provided. Cannot decrypt encrypted data');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        let popAPI: nock.Scope;
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
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { recordKey })]);
            expect(bodyObj.filter.record_key).to.equal(storage.createKeyHash(recordKeyNormalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize filter object', async () => {
            const storage = await getDefaultStorage(true);
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { recordKey })]);
            expect(bodyObj.filter.record_key).to.equal(storage.createKeyHash(recordKey));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse());
          await storage.find('uS', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse());
          await storage.find('Us', { key: '123' });

          nockEndpoint(POPAPI_HOST, 'find', country).reply(200, getDefaultFindResponse());
          await storage.find('US', { key: '123' });
        });
      });
    });

    describe('findOne', () => {
      describe('arguments validation', () => {
        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.findOne(COUNTRY, {}, {}, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.findOne(COUNTRY, {}, {}, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.findOne(COUNTRY, {}, {}))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.findOne(COUNTRY, {}, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });

        describe('filter validation', () => {
          it('should throw an error when filter has wrong format', async () => Promise.all(
            // @ts-ignore
            INVALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .to.be.rejectedWith(StorageError, 'FindFilter', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when filter has correct format', async () => Promise.all(
            // @ts-ignore
            VALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .not.to.be.rejectedWith(StorageError, '<FindFilter>', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when find filter is not provided', async () => {
            expect(encStorage.find(COUNTRY))
              .not.to.be.rejectedWith(StorageError, '<FindFilter>');
          });
        });
      });

      it('should enforce limit:1', async () => {
        const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, {
            meta: {
              count: 0, limit: 100, offset: 0, total: 0,
            },
            data: [],
          });

        const [bodyObj] = await Promise.all<any>([
          getNockedRequestBodyObject(popAPI),
          encStorage.findOne(COUNTRY, { key: '' }, { limit: 100, offset: 0 }),
        ]);
        expect(bodyObj.options).to.deep.equal({ limit: 1, offset: 0 });
      });

      it('should return null when no results found', async () => {
        nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, getDefaultFindResponse());

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      it('should findOne by key10', async () => {
        const filter = { key10: TEST_RECORDS[4].key10 as string };
        const resultRecords = TEST_RECORDS.filter((rec) => rec.key10 === filter.key10);
        const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));
        const apiRecords = encryptedRecords.map((record) => ({
          ...EMPTY_API_RECORD,
          ...record,
          body: record.body || '',
        }));

        nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, getDefaultFindResponse(apiRecords));
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
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const apiRecords = encryptedRecords.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));
          const migrateResult = { meta: { migrated: apiRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };

          const encStorage2 = await getDefaultStorage(true, false, () => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          }));

          const popAPIFind = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse(apiRecords));
          const popAPIBatchWrite = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200, 'OK');

          const [findBodyObj, , result] = await Promise.all<any>([
            getNockedRequestBodyObject(popAPIFind),
            getNockedRequestBodyObject(popAPIBatchWrite),
            encStorage2.migrate(COUNTRY, apiRecords.length),
          ]);

          expect(findBodyObj.filter.version).to.deep.equal({ $not: newSecret.version });

          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });

      it('should throw error if cannot decrypt any record', async () => {
        const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
        const apiRecords = encryptedRecords.map((record) => ({
          ...EMPTY_API_RECORD,
          ...record,
          body: record.body || '',
        }));

        const oldSecret = { secret: SECRET_KEY, version: 1 };
        const newSecret = { secret: 'keykey', version: 2 };

        const encStorage2 = await getDefaultStorage(true, false, () => ({
          secrets: [oldSecret, newSecret],
          currentVersion: newSecret.version,
        }));

        const response = getDefaultFindResponse(apiRecords);
        nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
          .reply(200, response);

        await expect(encStorage2.migrate(COUNTRY, apiRecords.length))
          .to.be.rejectedWith(StorageError, 'Secret not found for version 0');
      });

      describe('arguments', () => {
        it('should use default limit if nothing has been passed', async () => {
          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse());

          const bodyObjPromise = getNockedRequestBodyObject(popAPI);
          encStorage.migrate(COUNTRY).catch(noop);

          const bodyObj: any = await bodyObjPromise;
          expect(bodyObj.options.limit).to.equal(FIND_LIMIT);
        });

        it('should use passed limit', async () => {
          const limit = 3;
          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY)
            .reply(200, getDefaultFindResponse());

          const bodyObjPromise = getNockedRequestBodyObject(popAPI);
          encStorage.migrate(COUNTRY, limit).catch(noop);
          const bodyObj: any = await bodyObjPromise;
          expect(bodyObj.options.limit).to.equal(limit);
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.migrate(COUNTRY, 1, {}, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.migrate(COUNTRY, 1, {}, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.migrate(COUNTRY, 1, {}))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.migrate(COUNTRY, 1, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });
    });

    describe('batchWrite', () => {
      let popAPI: nock.Scope;

      beforeEach(() => {
        popAPI = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200, 'OK');
      });

      describe('arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.batchWrite(country))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });

        describe('request options', () => {
          const recordsData = [{ recordKey: '123' }];
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.batchWrite(COUNTRY, recordsData, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.batchWrite(COUNTRY, recordsData, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.batchWrite(COUNTRY, recordsData))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.batchWrite(COUNTRY, recordsData, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
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
          error: 'batchWrite() Validation Error: <RecordsArray>.0.recordKey should be string but got undefined',
        },
        {
          name: 'when any record from 4 has no key field',
          arg: [{ recordKey: '1' }, { recordKey: '1' }, { recordKey: '1' }, {}],
          error: 'batchWrite() Validation Error: <RecordsArray>.3.recordKey should be string but got undefined',
        },
        {
          name: 'when any record has wrong format',
          arg: [{ recordKey: '1', key2: 41234512 }],
          error: 'batchWrite() Validation Error: <RecordsArray>.0.key2 should be (string | null) but got 41234512',
        }];

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            // @ts-ignore
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
              const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
              const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord: any) => storage.decryptPayload({ ...EMPTY_API_RECORD, ...encRecord })));
              decryptedRecords.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
            });

            it('should set "is_encrypted"', async () => {
              const storage = opt.encrypted ? encStorage : noEncStorage;
              const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
              bodyObj.records.forEach((r: any) => {
                expect(r.is_encrypted).to.equal(opt.encrypted);
              });
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
            const records = [{ recordKey: key1 }, { recordKey: key2 }];
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].record_key).to.equal(storage.createKeyHash(key1Normalized));
            expect(bodyObj.records[1].record_key).to.equal(storage.createKeyHash(key2Normalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const records = [{ recordKey: key1 }, { recordKey: key2 }];
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].record_key).to.equal(storage.createKeyHash(key1));
            expect(bodyObj.records[1].record_key).to.equal(storage.createKeyHash(key2));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('uS', [{ recordKey: '123' }]);

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('Us', [{ recordKey: '123' }]);

          nockEndpoint(POPAPI_HOST, 'batchWrite', country).reply(200, 'OK');
          await storage.batchWrite('US', [{ recordKey: '123' }]);
        });
      });
    });

    describe('compatibility', async () => {
      let storage: Storage;

      beforeEach(async () => {
        storage = await createStorage({
          apiKey: 'string',
          environmentId: 'InCountry',
          endpoint: POPAPI_HOST,
          encrypt: true,
          normalizeKeys: false,
          getSecrets: defaultGetSecretsCallback,
          logger: LOGGER_STUB(),
        });
      });


      PREPARED_PAYLOAD.forEach(async (data, index) => {
        context(`with prepared payload [${index}]`, () => {
          it('should encrypt and match result', async () => {
            const encrypted = await storage.encryptPayload(data.dec);
            expect(_.omit(encrypted, ['body', 'precommit_body'])).to.deep.include(_.omit(data.enc, ['body', 'precommit_body']));
          });

          it('should decrypt and match result', async () => {
            const decrypted = await storage.decryptPayload({ ...EMPTY_API_RECORD, ...data.enc });
            expect(decrypted).to.deep.include(data.dec);
          });
        });

        it('should throw error with wrong body format', async () => {
          const { message: emptyBody } = await storage.crypto.encrypt(JSON.stringify({}));
          const wrongData = { ...EMPTY_API_RECORD, ...data.enc, body: emptyBody };

          await expect(storage.decryptPayload(wrongData)).to.be.rejectedWith('Invalid record body');
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
            logger: LOGGER_STUB(),
          });

          const storage2 = await createStorage({
            apiKey: 'string',
            environmentId: 'env2',
            endpoint: POPAPI_HOST,
            encrypt: true,
            normalizeKeys: false,
            getSecrets: defaultGetSecretsCallback,
            logger: LOGGER_STUB(),
          });

          const encrypted1 = await storage1.encryptPayload(PREPARED_PAYLOAD[1].dec as StorageRecordData);
          const encrypted2 = await storage2.encryptPayload(PREPARED_PAYLOAD[1].dec as StorageRecordData);

          KEYS_TO_HASH.forEach((key) => {
            if (encrypted1[key] !== undefined && encrypted2[key] !== undefined) {
              expect(encrypted1[key]).to.not.equal(encrypted2[key]);
            }
          });
        });
      });
    });
  });
});
