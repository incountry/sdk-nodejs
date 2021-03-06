import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { Readable } from 'stream';

import { ApiClient, DEFAULT_FILE_NAME } from '../../src/api-client';
import {
  StorageNetworkError,
  StorageAuthenticationError,
  StorageServerError,
  StorageConfigValidationError,
} from '../../src/errors';
import { CountriesCache, Country } from '../../src/countries-cache';
import { OAuthClient, getStaticTokenAuthClient } from '../../src/auth-client';
import { accessTokenResponse, nockDefaultAuth, nockDefaultAuthMultiple } from '../test-helpers/auth-nock';
import { getNockedRequestHeaders, nockPopApi, getNockedRequestBodyRaw } from '../test-helpers/popapi-nock';
import { Int } from '../../src/validation/utils';
import { EMPTY_API_RESPONSE_ATTACHMENT_META, EMPTY_API_RESPONSE_RECORD, toApiRecord } from './storage/common';


chai.use(chaiAsPromised);
const { expect, assert } = chai;

const COUNTRY = 'us';
const CUSTOM_POPAPI_HOST = 'https://test.example';
const POPAPI_HOST = `https://${COUNTRY}-mt-01.api.incountry.io`;
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
const HOST_NOT_FOUND_ERROR = { code: 'ENOTFOUND' };
const HOST_UNREACHABLE_ERROR = { code: 'EHOSTUNREACH' };
const CONNECTION_REFUSED_ERROR = { code: 'ECONNREFUSED' };

const EMPTY_RECORD = {
  body: '',
  version: 0 as Int,
  createdAt: new Date(),
  updatedAt: new Date(),
  precommitBody: null,
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
  key11: null,
  key12: null,
  key13: null,
  key14: null,
  key15: null,
  key16: null,
  key17: null,
  key18: null,
  key19: null,
  key20: null,
  serviceKey1: null,
  serviceKey2: null,
  serviceKey3: null,
  serviceKey4: null,
  serviceKey5: null,
  profileKey: null,
  rangeKey1: null,
  rangeKey2: null,
  rangeKey3: null,
  rangeKey4: null,
  rangeKey5: null,
  rangeKey6: null,
  rangeKey7: null,
  rangeKey8: null,
  rangeKey9: null,
  rangeKey10: null,
  attachments: [],
};

function createFakeCountriesCache(countries: Country[]) {
  const countriesCache = new CountriesCache();
  countriesCache.getCountries = async () => countries;
  return countriesCache;
}

const getApiClient = (host?: string, cache?: CountriesCache, useApiKey = true, endpointMask?: string) => {
  const apiKey = 'string';
  const environmentId = 'string';
  const loggerFn = (level: string, message: string, meta?: any) => [level, message, meta];
  const authClient = useApiKey ? getStaticTokenAuthClient(apiKey) : new OAuthClient('clientId', 'clientSecret');
  const countryFn = cache ? cache.getCountries.bind(cache, undefined) : () => Promise.resolve([]);

  return new ApiClient(authClient, environmentId, host, loggerFn, countryFn, endpointMask);
};

describe('ApiClient', () => {
  const countriesCache = createFakeCountriesCache([
    {
      id: 'BE', name: 'Belgium', direct: true, region: 'EMEA',
    },
    {
      id: 'HU', name: 'Hungary', direct: true, region: 'EMEA',
    },
    {
      id: 'IN', name: 'India', direct: true, region: 'APAC',
    },
  ]);

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('getEndpoint', () => {
    let nockPB: nock.Scope;

    const expectCorrectURLReturned = async (apiClient: ApiClient, country: string, host: string, audience?: string, region?: string) => {
      const testPath = 'testPath';
      const res = await apiClient.getEndpoint(country, testPath, {});
      assert.equal(nockPB.isDone(), false, 'PB was not called');
      expect(res).to.be.an('object');
      expect(res).to.have.keys(['endpoint', 'audience', 'region']);
      expect(res.audience).to.include(host);
      if (audience) {
        expect(res.audience).to.eq(audience);
      }
      expect(res.endpoint).to.eq(`${host}/${testPath}`);
      if (region) {
        expect(res.region).to.eq(region);
      }
    };

    beforeEach(() => {
      nockPB = nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
    });

    describe('if the host was set during ApiClient creation', () => {
      it('should use the provided host', async () => {
        const apiClient = getApiClient(CUSTOM_POPAPI_HOST);
        await expectCorrectURLReturned(apiClient, COUNTRY, CUSTOM_POPAPI_HOST);
      });

      it('should use EMEA region', async () => {
        const apiClient = getApiClient(CUSTOM_POPAPI_HOST);
        await expectCorrectURLReturned(apiClient, COUNTRY, CUSTOM_POPAPI_HOST, undefined, 'EMEA');
      });

      describe('when the provided host is not equal to country (minipop) host', () => {
        it('should use requested host as audience', async () => {
          const apiClient = getApiClient(CUSTOM_POPAPI_HOST);
          await expectCorrectURLReturned(apiClient, COUNTRY, CUSTOM_POPAPI_HOST, CUSTOM_POPAPI_HOST);
        });
      });

      describe('when the provided host is equal to country (minipop) host', () => {
        it('should use requested host as audience', async () => {
          const country = 'zz';
          const customPOPAPIHost = `https://${country}.api.incountry.io`;
          const apiClient = getApiClient(customPOPAPIHost);
          await expectCorrectURLReturned(apiClient, country, customPOPAPIHost, customPOPAPIHost);
        });
      });

      describe("when the endpointMask was provided to ApiClient and provided host doesn't match endpointMask", () => {
        it('should add requested minipop host to audience', async () => {
          const country = 'zz';
          const endpointMask = '.test.example.com';
          const customPOPAPIHost = 'https://custom.popapi.host';
          const audience = `${customPOPAPIHost} https://${country}${endpointMask}`;
          const apiClient = getApiClient(customPOPAPIHost, undefined, false, endpointMask);
          await expectCorrectURLReturned(apiClient, country, customPOPAPIHost, audience);
        });
      });

      describe('when the endpointMask was provided to ApiClient and provided host matches endpointMask', () => {
        it('should use requested host as audience', async () => {
          const country = 'zz';
          const endpointMask = '.custom.popapi.host';
          const customPOPAPIHost = `https://${country}${endpointMask}`;
          const apiClient = getApiClient(customPOPAPIHost, undefined, false, endpointMask);
          await expectCorrectURLReturned(apiClient, country, customPOPAPIHost, customPOPAPIHost);
        });
      });
    });

    describe('otherwise it should request country data from CountriesCache', () => {
      let apiClient: ApiClient;
      let apiClientWithMask: ApiClient;
      const endpointMask = '.custom.popapi.host';

      beforeEach(() => {
        apiClient = getApiClient(undefined, countriesCache);
        apiClientWithMask = getApiClient(undefined, countriesCache, false, endpointMask);
      });

      describe('when the host provided by CountriesCache matches requested country', () => {
        it('should use the host provided by CountriesCache', async () => {
          const country = 'hu';
          const customPOPAPIHost = `https://${country}-mt-01.api.incountry.io`;
          await expectCorrectURLReturned(apiClient, country, customPOPAPIHost);
        });

        it('should use midpop region', async () => {
          const countryEmea = 'hu';
          const countryApac = 'in';
          const huPOPAPIHost = `https://${countryEmea}-mt-01.api.incountry.io`;
          const inPOPAPIHost = `https://${countryApac}-mt-01.api.incountry.io`;
          await expectCorrectURLReturned(apiClient, countryEmea, huPOPAPIHost, undefined, 'EMEA');
          await expectCorrectURLReturned(apiClient, countryApac, inPOPAPIHost, undefined, 'APAC');
        });

        it('should return audience equal to the requested host', async () => {
          const country = 'hu';
          const customPOPAPIHost = `https://${country}-mt-01.api.incountry.io`;
          await expectCorrectURLReturned(apiClient, country, customPOPAPIHost, customPOPAPIHost);
        });

        describe('when endpointMask parameter was set', () => {
          it('should apply endpointMask to the host provided by CountriesCache and produce correct audience', async () => {
            const country = 'hu';
            const customPOPAPIHost = `https://${country}${endpointMask}`;
            await expectCorrectURLReturned(apiClientWithMask, country, customPOPAPIHost, customPOPAPIHost);
          });
        });
      });

      describe("when the host provided by CountriesCache doesn't match requested country", () => {
        it('should use the default host otherwise', async () => {
          const country = 'ae';
          await expectCorrectURLReturned(apiClient, country, POPAPI_HOST);
        });

        it('should use EMEA region for minipops', async () => {
          const country = 'zz';
          await expectCorrectURLReturned(apiClient, country, POPAPI_HOST, undefined, 'EMEA');
        });

        it('should add requested country (minipop) host to audience', async () => {
          const country = 'ae';
          const audience = `${POPAPI_HOST} https://${country}-mt-01.api.incountry.io`;
          await expectCorrectURLReturned(apiClient, country, POPAPI_HOST, audience);
        });

        describe('when endpointMask parameter was set', () => {
          it('should apply endpointMask to the default host and produce correct audience', async () => {
            const country = 'ae';
            const customPOPAPIHost = `https://${COUNTRY}${endpointMask}`;
            const audience = `${customPOPAPIHost} https://${country}${endpointMask}`;
            await expectCorrectURLReturned(apiClientWithMask, country, customPOPAPIHost, audience);
          });
        });
      });
    });

    describe('when CountriesCache threw an error', () => {
      it('should throw StorageServerError', async () => {
        const failingCache = new CountriesCache();
        failingCache.getCountries = () => {
          throw new Error('test');
        };
        const country = 'ae';
        const apiClient = getApiClient(undefined, failingCache);
        await expect(apiClient.getEndpoint(country, 'testPath', {})).to.be.rejectedWith(StorageServerError, 'Unable to retrieve countries list: test');
        assert.equal(nockPB.isDone(), false, 'PB was not called');
      });
    });

    describe('when countries list provider responds with server error', () => {
      let countriesProviderNock: nock.Scope;
      const countriesProviderHost = 'test.example';
      const countriesProviderEndpoint = `https://${countriesProviderHost}${PORTAL_BACKEND_COUNTRIES_LIST_PATH}`;

      beforeEach(() => {
        countriesProviderNock = nock(`https://${countriesProviderHost}`).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(500, { error: 'Oh no!' });
      });

      it('should throw StorageServerError', async () => {
        const workingCache = new CountriesCache(countriesProviderEndpoint, 1000, Date.now() + 1000);
        const country = 'ae';
        const apiClient = getApiClient(undefined, workingCache);
        await expect(apiClient.getEndpoint(country, 'testPath', {})).to.be.rejectedWith(StorageServerError, 'Countries provider error: Request failed with status code 500');
        assert.equal(countriesProviderNock.isDone(), true, 'Countries provider was called');
      });
    });
  });

  describe('request', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST);
    });

    describe('errors handling', () => {
      const errorCases = [
        {
          name: 'on 404',
          respond: (popAPI: nock.Interceptor) => popAPI.reply(404),
          errorClass: StorageServerError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} 404`,
        },
        {
          name: 'on 500',
          respond: (popAPI: nock.Interceptor) => popAPI.reply(500),
          errorClass: StorageServerError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} 500`,
        },
        {
          name: 'on 500 with error data',
          respond: (popAPI: nock.Interceptor) => popAPI.reply(500, { errors: '' }),
          errorClass: StorageServerError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} 500`,
        },
        {
          name: 'on 500 with error data',
          respond: (popAPI: nock.Interceptor) => popAPI.reply(500, { errors: [{ message: 'b' }] }),
          errorClass: StorageServerError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} 500`,
        },
        {
          name: 'in case of network error (REQUEST_TIMEOUT)',
          respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
          errorClass: StorageNetworkError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} ${REQUEST_TIMEOUT_ERROR.code}`,
        },
        {
          name: 'in case of network error (CONNECTION_REFUSED)',
          respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(CONNECTION_REFUSED_ERROR),
          errorClass: StorageNetworkError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} ${CONNECTION_REFUSED_ERROR.code}`,
        },
        {
          name: 'in case of network error (HOST_NOT_FOUND)',
          respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(HOST_NOT_FOUND_ERROR),
          errorClass: StorageConfigValidationError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} ${HOST_NOT_FOUND_ERROR.code}`,
        },
        {
          name: 'in case of network error (HOST_UNREACHABLE)',
          respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(HOST_UNREACHABLE_ERROR),
          errorClass: StorageConfigValidationError,
          errorMessage: `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY} ${HOST_UNREACHABLE_ERROR.code}`,
        },
      ];

      errorCases.forEach((errCase) => {
        it(`should throw ${errCase.errorClass.name} ${errCase.name}`, async () => {
          const scope = errCase.respond(nockPopApi(POPAPI_HOST).write(COUNTRY));
          await expect(apiClient.write(COUNTRY, { record_key: '' }))
            .to.be.rejectedWith(errCase.errorClass, errCase.errorMessage);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });

    describe('when wrong response received', () => {
      it('should throw validation error', async () => {
        const filter = { key1: ['test'] };
        const wrongFindResponse = {
          meta: { total: 0, limit: 100, offset: 0 },
          data: [],
        };
        const wrongPopAPI = nockPopApi(POPAPI_HOST).find(COUNTRY).reply(200, wrongFindResponse);
        await expect(apiClient.find(COUNTRY, { filter }, {}))
          .to.be.rejectedWith(StorageServerError, 'Response Validation Error: <FindResponse>.meta.count should be Int but got undefined');
        assert.equal(wrongPopAPI.isDone(), true, 'Nock scope is done');
      });
    });

    describe('methods', () => {
      describe('read', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const record = {
            ...EMPTY_API_RESPONSE_RECORD,
            record_key,
          };
          const popAPI = nockPopApi(POPAPI_HOST).read(COUNTRY, record_key).reply(200, record);
          const result = await apiClient.read(COUNTRY, record_key);
          expect(result).to.deep.equal(toApiRecord(record));
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('write', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const record = {
            ...EMPTY_RECORD,
            record_key,
          };
          const popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200);
          await apiClient.write(COUNTRY, record);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('delete', () => {
        it('should not throw error with correct data', async () => {
          const key = '123';
          const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, key).reply(200);
          await apiClient.delete(COUNTRY, key);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('find', () => {
        it('should not throw error with correct data', async () => {
          const filter = { key1: ['test'] };
          const response = {
            meta: {
              total: 0, limit: 100, offset: 0, count: 0,
            },
            data: [],
          };
          const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY).reply(200, response);
          await apiClient.find(COUNTRY, { filter });
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('batchWrite', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const record = {
            ...EMPTY_RECORD,
            record_key,
          };
          const popAPI = nockPopApi(POPAPI_HOST).batchWrite(COUNTRY).reply(200);
          await apiClient.batchWrite(COUNTRY, { records: [record] });
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('addAttachment', () => {
        it('should send file data from stream', async () => {
          const recordKey = '123';
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, recordKey).reply(200, EMPTY_API_RESPONSE_ATTACHMENT_META);

          const chunks = ['1111111', '2222222', '3333333'];
          const fileName = 'test123';

          const data$ = new Readable({
            objectMode: true,
            read() {},
          });

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = apiClient.addAttachment(COUNTRY, recordKey, { fileName, file: data$ });

          data$.push(chunks[0]);
          data$.push(chunks[1]);
          data$.push(chunks[2]);
          data$.push(null);

          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(chunks.join(''));
          expect(bodyObj).to.include(fileName);
        });


        it('should send default file name if nothing has been provided', async () => {
          const recordKey = '123';
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, recordKey).reply(200, EMPTY_API_RESPONSE_ATTACHMENT_META);

          const chunks = ['1111111', '2222222', '3333333'];

          const data$ = new Readable({
            objectMode: true,
            read() {},
          });

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = apiClient.addAttachment(COUNTRY, recordKey, { file: data$ });

          data$.push(chunks[0]);
          data$.push(chunks[1]);
          data$.push(chunks[2]);
          data$.push(null);

          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(chunks.join(''));
          expect(bodyObj).to.include(DEFAULT_FILE_NAME);
        });
      });

      describe('upsertAttachment', () => {
        it('should send file data from stream', async () => {
          const recordKey = '123';
          const popAPI = nockPopApi(POPAPI_HOST).upsertAttachment(COUNTRY, recordKey).reply(200, EMPTY_API_RESPONSE_ATTACHMENT_META);

          const chunks = ['1111111', '2222222', '3333333'];

          const data$ = new Readable({
            objectMode: true,
            read() {},
          });

          const fileName = 'test';

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = apiClient.upsertAttachment(COUNTRY, recordKey, { fileName, file: data$ });

          data$.push(chunks[0]);
          data$.push(chunks[1]);
          data$.push(chunks[2]);
          data$.push(null);

          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(chunks.join(''));
          expect(bodyObj).to.include(fileName);
        });
      });

      describe('deleteAttachment', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const file_id = '122223';
          const response = {};
          const popAPI = nockPopApi(POPAPI_HOST).deleteAttachment(COUNTRY, record_key, file_id).reply(200, response);
          await apiClient.deleteAttachment(COUNTRY, record_key, file_id);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('updateAttachmentMeta', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const file_id = '122223';
          const popAPI = nockPopApi(POPAPI_HOST).updateAttachmentMeta(COUNTRY, record_key, file_id).reply(200, EMPTY_API_RESPONSE_ATTACHMENT_META);
          await apiClient.updateAttachmentMeta(COUNTRY, record_key, file_id, { fileName: 'new' });
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('getAttachmentMeta', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const file_id = '122223';
          const popAPI = nockPopApi(POPAPI_HOST).getAttachmentMeta(COUNTRY, record_key, file_id).reply(200, EMPTY_API_RESPONSE_ATTACHMENT_META);
          await apiClient.getAttachmentMeta(COUNTRY, record_key, file_id);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('getAttachmentFile', () => {
        it('should not throw error with correct data', async () => {
          const record_key = '123';
          const file_id = '122223';
          const response = {};
          const popAPI = nockPopApi(POPAPI_HOST).getAttachmentFile(COUNTRY, record_key, file_id).reply(200, response);
          await apiClient.getAttachmentFile(COUNTRY, record_key, file_id);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });
    });
  });

  describe('authorization', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST, undefined, false);
      nockDefaultAuth().reply(200, accessTokenResponse());
    });

    it('should send access_token in Authorization header', async () => {
      const popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200, 'OK');
      const [headers] = await Promise.all<Record<string, string>, unknown>([getNockedRequestHeaders(popAPI), apiClient.write(COUNTRY, { record_key: '123' })]);
      const { authorization } = headers;
      expect(authorization).to.eq('Bearer access_token');
      assert.equal(popAPI.isDone(), true, 'Nock scope is done');
    });
  });

  describe('authorization with OAuth token provided in options', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST, undefined, true);
    });

    it('should send token in Authorization header', async () => {
      const popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200, 'OK');
      const [headers] = await Promise.all<Record<string, string>, unknown>([getNockedRequestHeaders(popAPI), apiClient.write(COUNTRY, { record_key: '123' })]);
      const { authorization } = headers;
      expect(authorization).to.eq('Bearer string');
      assert.equal(popAPI.isDone(), true, 'Nock scope is done');
    });
  });

  describe('request repeating', () => {
    let apiClient: ApiClient;
    let authHeaders: Record<string, string>[] = [];

    const collectAuthHeaders = (nockedAPI: nock.Scope) => {
      nockedAPI.on('request', (req) => authHeaders.push(req.headers.authorization));
    };

    beforeEach(() => {
      authHeaders = [];
      apiClient = getApiClient(POPAPI_HOST, undefined, false);
      nockDefaultAuthMultiple(3, 3599);
    });

    it('should renew token and repeat request once in case of single 401 error', async () => {
      const writePath = `/v2/storage/records/${COUNTRY}`;
      const popAPI = nock(POPAPI_HOST)
        .post(writePath)
        .reply(401)
        .post(writePath)
        .reply(200, 'OK');

      collectAuthHeaders(popAPI);

      await apiClient.write(COUNTRY, { record_key: '123' });
      expect(authHeaders).to.deep.equal(['Bearer access_token1', 'Bearer access_token2']);
      assert.equal(popAPI.isDone(), true, 'Nock scope is done');
    });

    it('should renew token only once and should not repeat request more than once', async () => {
      const writePath = `/v2/storage/records/${COUNTRY}`;
      const popAPI = nock(POPAPI_HOST)
        .post(writePath)
        .times(3)
        .reply(401);

      collectAuthHeaders(popAPI);

      await expect(apiClient.write(COUNTRY, { record_key: '123' }))
        .to.be.rejectedWith(StorageAuthenticationError, `POST ${POPAPI_HOST}${writePath} Request failed with status code 401`);
      expect(authHeaders).to.deep.equal(['Bearer access_token1', 'Bearer access_token2']);
      assert.equal(popAPI.pendingMocks().length, 1, 'Nock scope is done');
    });
  });
});
