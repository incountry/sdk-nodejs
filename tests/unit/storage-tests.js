const chai = require('chai');
const {expect} = chai;

const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');

const Storage = require('../../storage');
const CryptKeyAccessor = require('../../crypt-key-accessor');

const POPAPI_URL = "popapi.com"
const COUNTRY = 'us'
const SECRET_KEY = 'password'

const convertKeys = (o) => {
  const dict = {
    profileKey: 'profile_key',
    rangeKey: 'range_key',
  }
  return Object.keys(o).reduce((accum, key) => {
    return {
      ...accum,
      [dict[key] || key]: o[key]
    }
  }, {})
};

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
  let storage;
  beforeEach(function () {
    storage = new Storage({
        apiKey: 'string',
        environmentId: 'string',
      },
      fakeCountriesCache,
      new CryptKeyAccessor(() => SECRET_KEY)
    )
  });
  TEST_RECORDS.forEach((testCase, idx) => {
    context(`with test case ${idx}`, function () {
      it('should write a record', function (done) {
        const scope = nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us')
          .reply(200);
        storage.writeAsync(testCase)
        scope.on('request', async function(req, interceptor, body) {
          try {
            const encrypted = await storage._encryptPayload(convertKeys(testCase))
            expect(JSON.parse(body)).to.deep.equal(encrypted);
            done();
          } catch (e) {
            done(e)
          }
        });
      });
      it('should read a record', async function () {
        const encrypted = await storage._encryptPayload(convertKeys(testCase));
        nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${encrypted.key}`)
          .reply(200, encrypted);
        const {data} = await storage.readAsync(testCase);
        const expected = _.pick(testCase, ['key', 'body']);
        expect(data).to.deep.include(expected);
      })
      it('should delete a record', function (done) {
        storage._encryptPayload(convertKeys(testCase)).then((encrypted) => {
          const scope = nock('https://us.api.incountry.io')
            .delete(`/v2/storage/records/us/${encrypted.key}`)
            .reply(200);
          storage.deleteAsync(testCase)
          scope.on('error', done);
          scope.on('request', () => done())
        }).catch(done);
      })
    })
  });
  it('should batch read', function (done) {
    const request = {
      country: 'us',
      GET: TEST_RECORDS.map((record) => record.key),
    };
    Promise.all(TEST_RECORDS.map((testCase) => storage._encryptPayload(convertKeys(testCase)))).then((encrypted) => {
      const scope = nock('https://us.api.incountry.io')
        .post('/v2/storage/batches/us')
        .reply(200, {GET: encrypted});
      scope.on('request', async function (req, interceptor, body) {
        try {
          const expected = {GET: request.GET.map((id) => storage.createKeyHash(id))}
          expect(JSON.parse(body)).to.eql(expected)
        } catch (e) {
          done(e)
        }
      });
      scope.on('error', done);
      storage.batchAsync(request).then((response) => {
        try {
          expect(response.data).to.eql({GET: TEST_RECORDS.map((record) => convertKeys(record))})
          done()
        } catch (e) {
          done(e)
        }
      })
    })
  })
})