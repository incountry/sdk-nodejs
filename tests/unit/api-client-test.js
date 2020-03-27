const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const { ApiClient } = require('../../api-client');
const { StorageServerError, StorageValidationError } = require('../../errors');
const CountriesCache = require('../../countries-cache');
const { nockEndpoint } = require('../test-helpers/popapi-nock');

const { expect, assert } = chai;

const COUNTRY = 'us';
const CUSTOM_POPAPI_HOST = 'https://test.example';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };

function createFakeCountriesCache(countries) {
  const countriesCache = new CountriesCache();
  countriesCache.getCountriesAsync = async () => countries;
  return countriesCache;
}

const getApiClient = (host = undefined, cache = undefined) => {
  const apiKey = 'string';
  const environmentId = 'string';
  const loggerFn = (a, b) => [a, b];

  return new ApiClient(apiKey, environmentId, host, loggerFn, cache ? cache.getCountriesAsync.bind(cache) : cache);
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
        failingCache.getCountriesAsync = () => {
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

  describe('runQuery', () => {
    let apiClient;

    beforeEach(() => {
      apiClient = getApiClient(POPAPI_HOST);
    });

    describe('errors handling', () => {
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
          await expect(apiClient.runQuery(COUNTRY, undefined, 'write', {})).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });
    });

    describe('when called with wrong action', () => {
      it('should throw an error', async () => {
        await expect(apiClient.runQuery(COUNTRY, undefined, 'test', {})).to.be.rejectedWith(Error, 'Invalid action passed to ApiClient.');
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
        await expect(apiClient.runQuery(COUNTRY, undefined, 'find', filter)).to.be.rejectedWith(StorageValidationError);
        assert.equal(wrongPopAPI.isDone(), true, 'Nock scope is done');
      });
    });
  });
});