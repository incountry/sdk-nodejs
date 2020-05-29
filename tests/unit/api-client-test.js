const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const { ApiClient } = require('../../lib/api-client');
const { StorageServerError } = require('../../lib/errors');
const { CountriesCache } = require('../../lib/countries-cache');
const { OAuthClient, getApiKeyAuthClient } = require('../../lib/auth-client');
const { accessTokenResponse, nockDefaultAuth } = require('../test-helpers/auth-nock');
const { getNockedRequestHeaders, nockEndpoint } = require('../test-helpers/popapi-nock');

const { expect, assert } = chai;

const COUNTRY = 'us';
const CUSTOM_POPAPI_HOST = 'https://test.example';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };

const EMPTY_RECORD = {
  body: '',
  key2: null,
  key3: null,
  profile_key: null,
  range_key: null,
  version: 0,
};

function createFakeCountriesCache(countries) {
  const countriesCache = new CountriesCache();
  countriesCache.getCountries = async () => countries;
  return countriesCache;
}

const getApiClient = (host = undefined, cache = undefined, useApiKey = true) => {
  const apiKey = 'string';
  const environmentId = 'string';
  const loggerFn = (a, b) => [a, b];
  const authClient = useApiKey ? getApiKeyAuthClient(apiKey) : new OAuthClient('clientId', 'clientSecret');

  return new ApiClient(authClient, environmentId, host, loggerFn, cache ? cache.getCountries.bind(cache) : cache);
};

describe('ApiClient', () => {
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

    const expectCorrectURLReturned = async (apiClient, country, host) => {
      const testPath = 'testPath';
      const res = await apiClient.getEndpoint(country, testPath);
      assert.equal(nockPB.isDone(), false, 'PB was not called');
      expect(res).to.eq(`${host}/${testPath}`);
    };

    beforeEach(() => {
      nockPB = nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
    });

    describe('if the host was set during ApiClient creation', () => {
      it('should use the provided host', async () => {
        const apiClient = getApiClient(CUSTOM_POPAPI_HOST);
        await expectCorrectURLReturned(apiClient, COUNTRY, CUSTOM_POPAPI_HOST);
      });
    });

    describe('otherwise it should request country data from CountriesCache', () => {
      /** @type {ApiClient} */
      let apiClient;
      beforeEach(() => {
        apiClient = getApiClient(undefined, countriesCache);
      });
      it('should use the host provided by CountriesCache if it matches requested country', async () => {
        const country = 'hu';
        const customPOPAPIHost = `https://${country}.api.incountry.io`;
        await expectCorrectURLReturned(apiClient, country, customPOPAPIHost);
      });

      it('should use the default host otherwise', async () => {
        const country = 'ae';
        await expectCorrectURLReturned(apiClient, country, POPAPI_HOST);
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
        await expect(apiClient.getEndpoint(country, 'testPath')).to.be.rejectedWith(StorageServerError, 'Unable to retrieve countries list: test');
        assert.equal(nockPB.isDone(), false, 'PB was not called');
      });
    });

    describe('when countries list provider responds with server error', () => {
      let countriesProviderNock;
      const countriesProviderHost = 'test.example';

      beforeEach(() => {
        countriesProviderNock = nock(`https://${countriesProviderHost}`).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(500, { error: 'Oh no!' });
      });

      it('should throw StorageServerError', async () => {
        const workingCache = new CountriesCache(countriesProviderHost, 1000, Date.now() + 1000);
        const country = 'ae';
        const apiClient = getApiClient(undefined, workingCache);
        await expect(apiClient.getEndpoint(country, 'testPath')).to.be.rejectedWith(StorageServerError, 'Unable to retrieve countries list: Request failed with status code 500');
        assert.equal(countriesProviderNock.isDone(), true, 'Countries provider was called');
      });
    });
  });

  describe('request', () => {
    /** @type {ApiClient} */
    let apiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST);
    });

    describe('errors handling', () => {
      const errorCases = [
        {
          name: 'on 404',
          respond: (popAPI) => popAPI.reply(404),
        },
        {
          name: 'on 500',
          respond: (popAPI) => popAPI.reply(500),
        },
        {
          name: 'on 500 with error data',
          respond: (popAPI) => popAPI.reply(500, { errors: '' }),
        },
        {
          name: 'on 500 with error data',
          respond: (popAPI) => popAPI.reply(500, { errors: [{ message: 'b' }] }),
        },
        {
          name: 'in case of network error',
          respond: (popAPI) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
        },
      ];

      errorCases.forEach((errCase) => {
        it(`should throw StorageServerError ${errCase.name}`, async () => {
          const scope = errCase.respond(nockEndpoint(POPAPI_HOST, 'write', COUNTRY));
          await expect(apiClient.write(COUNTRY, {})).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });

    describe('when wrong response received', () => {
      it('should throw validation error', async () => {
        const filter = { key: ['test'] };
        const wrongFindResponse = {
          meta: { total: 0, limit: 100, offset: 0 },
          data: [],
        };
        const wrongPopAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, wrongFindResponse);
        await expect(apiClient.find(COUNTRY, { filter })).to.be.rejectedWith(StorageServerError);
        assert.equal(wrongPopAPI.isDone(), true, 'Nock scope is done');
      });
    });

    describe('methods', () => {
      describe('read', () => {
        it('should not throw error with correct data', async () => {
          const key = '123';
          const record = {
            ...EMPTY_RECORD,
            key,
          };
          const popAPI = nockEndpoint(POPAPI_HOST, 'read', COUNTRY, key).reply(200, record);
          const result = await apiClient.read(COUNTRY, key);
          await expect(result).to.deep.equal(record);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('write', () => {
        it('should not throw error with correct data', async () => {
          const key = '123';
          const record = {
            ...EMPTY_RECORD,
            key,
          };
          const popAPI = nockEndpoint(POPAPI_HOST, 'write', COUNTRY).reply(200);
          await apiClient.write(COUNTRY, record);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('delete', () => {
        it('should not throw error with correct data', async () => {
          const key = '123';
          const popAPI = nockEndpoint(POPAPI_HOST, 'delete', COUNTRY, key).reply(200);
          await apiClient.delete(COUNTRY, key);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('find', () => {
        it('should not throw error with correct data', async () => {
          const filter = { key: ['test'] };
          const response = {
            meta: {
              total: 0, limit: 100, offset: 0, count: 0,
            },
            data: [],
          };
          const popAPI = nockEndpoint(POPAPI_HOST, 'find', COUNTRY).reply(200, response);
          await apiClient.find(COUNTRY, filter);
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });

      describe('batchWrite', () => {
        it('should not throw error with correct data', async () => {
          const key = '123';
          const record = {
            ...EMPTY_RECORD,
            key,
          };
          const popAPI = nockEndpoint(POPAPI_HOST, 'batchWrite', COUNTRY).reply(200);
          await apiClient.batchWrite(COUNTRY, { data: { records: [record] } });
          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
        });
      });
    });
  });

  describe('authorization', () => {
    /** @type {ApiClient} */
    let apiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST, undefined, false);
      nockDefaultAuth().reply(200, accessTokenResponse());
    });

    it('should send access_token in Authorization header', async () => {
      const popAPI = nockEndpoint(POPAPI_HOST, 'write', COUNTRY).reply(200, 'OK');
      const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), apiClient.write(COUNTRY, {})]);
      const { authorization } = headers;
      expect(authorization).to.eq('Bearer access_token');
      assert.equal(popAPI.isDone(), true, 'Nock scope is done');
    });
  });
});
