const chai = require('chai');
chai.use(require('chai-as-promised'));
const nock = require('nock');
const sinon = require('sinon');
const CountriesCache = require('../../countries-cache');

const { expect, assert } = chai;

const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const PORTAL_BACKEND_BASE_URL = `https://${PORTAL_BACKEND_HOST}`;
const PORTAL_BACKEND_PATH = '/countries';

const DIRECT_COUNTRIES_PB_RESPONSE = {
  countries: [
    { id: 'AE', name: 'United Arab Emirates', direct: true },
    { id: 'BE', name: 'Belgium', direct: true },
  ],
};

const MIXED_COUNTRIES_PB_RESPONSE = {
  countries: [
    { id: 'AE', name: 'United Arab Emirates', direct: true },
    { id: 'BE', name: 'Belgium', direct: false },
  ],
};

const nockPBCountriesAPI = (host, response) => nock(`https://${host}`).get(PORTAL_BACKEND_PATH).reply(200, response);

describe('Countries cache', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('host usage check', () => {
    it('should use correct portalHost by default', async () => {
      const pbCountriesAPI = nockPBCountriesAPI(PORTAL_BACKEND_HOST, DIRECT_COUNTRIES_PB_RESPONSE);

      const cache = new CountriesCache();
      await cache.getCountriesAsync();

      assert.equal(pbCountriesAPI.isDone(), true, 'CountriesAPI scope is done');
    });

    it('should use correct portalHost if custom host is provided', async () => {
      const customHost = 'portal.backend.host.example';
      const pbCountriesAPI = nockPBCountriesAPI(customHost, DIRECT_COUNTRIES_PB_RESPONSE);

      const cache = new CountriesCache(customHost);
      await cache.getCountriesAsync();

      assert.equal(pbCountriesAPI.isDone(), true, 'CountriesAPI scope is done');
    });
  });

  describe('getCountriesAsync()', () => {
    describe('if called first time', () => {
      beforeEach(() => {
        nockPBCountriesAPI(PORTAL_BACKEND_HOST, DIRECT_COUNTRIES_PB_RESPONSE);
      });

      it('should fetch countries', async () => {
        const cache = new CountriesCache();
        const countries = await cache.getCountriesAsync();
        expect(countries).to.deep.equal(DIRECT_COUNTRIES_PB_RESPONSE.countries);
      });

      it('should fetch countries even if an arbitrary timestamp was provided', async () => {
        const yesterdayTS = Date.now() - 24 * 60 * 60 * 1000; // -1 day
        const cache = new CountriesCache();
        const countries = await cache.getCountriesAsync(yesterdayTS);
        expect(countries).to.deep.equal(DIRECT_COUNTRIES_PB_RESPONSE.countries);
      });
    });

    describe('if called multiple times', () => {
      const apiMaxCalls = 5;
      const countriesResponses = [];
      for (let i = 0; i < apiMaxCalls; i += 1) {
        countriesResponses.push({
          countries: DIRECT_COUNTRIES_PB_RESPONSE.countries.map((item) => ({ ...item, id: item.id + i })),
        });
      }

      const nockPBCountriesAPIMultiple = () => {
        let requestCount = 0;
        return nock(`${PORTAL_BACKEND_BASE_URL}`)
          .get(PORTAL_BACKEND_PATH)
          .times(apiMaxCalls)
          .reply(200, () => {
            const res = countriesResponses[requestCount];
            requestCount += 1;
            return res;
          });
      };

      describe('if no timestamp was provided', () => {
        it('should fetch countries only first time', async () => {
          nockPBCountriesAPIMultiple();

          const cache = new CountriesCache();

          for (let i = 0; i < apiMaxCalls; i += 1) {
            /* eslint-disable no-await-in-loop */
            const countries = await cache.getCountriesAsync();
            expect(countries).to.deep.equal(countriesResponses[0].countries);
          }
        });

        it('should fetch countries if timeout passed', async () => {
          nockPBCountriesAPIMultiple();

          const clock = sinon.useFakeTimers();

          const cache = new CountriesCache();

          const countries0 = await cache.getCountriesAsync();
          expect(countries0).to.deep.equal(countriesResponses[0].countries);

          clock.tick(60 * 1000);

          const countries1 = await cache.getCountriesAsync();
          expect(countries1).to.deep.equal(countriesResponses[1].countries);

          clock.restore();
        });
      });

      describe('if timestamp was provided', () => {
        const oneHour = 60 * 60 * 1000;

        it('should fetch countries when countries list is outdated', async () => {
          nockPBCountriesAPIMultiple();

          const tomorrowTS = Date.now() + 24 * 60 * 60 * 1000; // +1 day
          const cache = new CountriesCache(undefined, oneHour);

          const countries1 = await cache.getCountriesAsync();
          expect(countries1).to.deep.equal(countriesResponses[0].countries);

          const countries2 = await cache.getCountriesAsync(tomorrowTS);
          expect(countries2).to.deep.equal(countriesResponses[1].countries);
        });

        it('should not fetch countries when countries list is not outdated', async () => {
          nockPBCountriesAPIMultiple();

          const yesterdayTS = Date.now() - 24 * 60 * 60 * 1000; // -1 day
          const cache = new CountriesCache(undefined, oneHour);

          const countries1 = await cache.getCountriesAsync();
          expect(countries1).to.deep.equal(countriesResponses[0].countries);

          const countries2 = await cache.getCountriesAsync(Date.now());
          expect(countries2).to.deep.equal(countriesResponses[0].countries);

          const countries3 = await cache.getCountriesAsync(yesterdayTS);
          expect(countries3).to.deep.equal(countriesResponses[0].countries);
        });
      });
    });

    describe('should return', () => {
      beforeEach(() => {
        nockPBCountriesAPI(PORTAL_BACKEND_HOST, MIXED_COUNTRIES_PB_RESPONSE);
      });

      it('only countries which are direct', async () => {
        const cache = new CountriesCache();
        const countries = await cache.getCountriesAsync();
        expect(countries).to.deep.equal(MIXED_COUNTRIES_PB_RESPONSE.countries.filter((item) => item.direct));
      });
    });

    describe('should handle errors', () => {
      describe('no data in the response', () => {
        const nockPBCountriesAPINoData = () => nock(`${PORTAL_BACKEND_BASE_URL}`).get(PORTAL_BACKEND_PATH).reply(200);

        it('should return empty countries array', async () => {
          nockPBCountriesAPINoData();

          const cache = new CountriesCache();
          const countries = await cache.getCountriesAsync();
          expect(countries).to.be.an('array');
          expect(countries.length).to.equal(0);
        });
      });

      describe('failed response', () => {
        const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
        const loggerStub = { write: () => null };
        const nockPBCountriesAPIFails = () => nock(`${PORTAL_BACKEND_BASE_URL}`).get(PORTAL_BACKEND_PATH).replyWithError(REQUEST_TIMEOUT_ERROR);

        it('should throw exception', async () => {
          nockPBCountriesAPIFails();

          const cache = new CountriesCache(undefined, undefined, undefined, loggerStub);

          try {
            await cache.getCountriesAsync();
          } catch (e) {
            expect(e).to.deep.equal(REQUEST_TIMEOUT_ERROR);
            return;
          }
          chai.assert.fail('Countries request did not failed');
        });

        it('should log error', async () => {
          nockPBCountriesAPIFails();
          const spy = sinon.spy(loggerStub, 'write');

          const cache = new CountriesCache(undefined, undefined, undefined, loggerStub);

          try {
            await cache.getCountriesAsync();
          } catch (e) {
            expect(spy.calledWith('error', REQUEST_TIMEOUT_ERROR)).to.equal(true);
            return;
          }
          chai.assert.fail('Countries request did not failed');
        });
      });
    });
  });
});
