const chai = require('chai');
const { expect } = chai;

const nock = require('nock');
const uuid = require('uuid/v4');

const Storage = require('../../storage');
const CryptKeyAccessor = require('../../crypt-key-accessor');

const POPAPI_URL = "popapi.com"
const COUNTRY = 'us'
const SECRET_KEY = 'password'

const TEST_RECORDS = [
  {"country": COUNTRY, "key": uuid()},
  {"country": COUNTRY, "key": uuid(), "body": "test"},
  {"country": COUNTRY, "key": uuid(), "body": "test", "key2": "key2"},
  {"country": COUNTRY, "key": uuid(), "body": "test", "key2": "key2", "key3": "key3"},
  {
    "country": COUNTRY,
    "key": uuid(),
    "body": "test",
    "key2": "key2",
    "key3": "key3",
    "profileKey": "profile_key",
  },
  {
    "country": COUNTRY,
    "key": uuid(),
    "body": "test",
    "key2": "key2",
    "key3": "key3",
    "profileKey": "profile_key",
    "rangeKey": 1,
  },
]

const fakeCountriesCache = {
  getCountriesAsync: async () => ["ru", "us"]
}

describe('Storage', function () {
  TEST_RECORDS.forEach((testCase) => {
    let storage;
    beforeEach(function() {
      storage = new Storage({
          apiKey: 'string',
          environmentId: 'string',
        },
        fakeCountriesCache,
        new CryptKeyAccessor(() => SECRET_KEY)
      )
    })
    it('should write record', function (done) {
      const scope = nock('https://us.api.incountry.io')
        .post('/v2/storage/records/us')
        .reply(200);
      storage.writeAsync(testCase)
      scope.on('request', async function(req, interceptor, body) {
        try {
          const encrypted = await storage._encryptPayload(testCase)
          expect(JSON.parse(body)).to.deep.equal(encrypted);
          done();
        } catch (e) {
          done(e)
        }
      });
      // return expect(scope).to.have.been.requestedWith({ hello: 'world' });
    })
  })
})