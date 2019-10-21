/* eslint-disable */
const chai = require('chai');
const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const Storage = require('../../storage');
const CryptKeyAccessor = require('../../crypt-key-accessor');

const {expect} = chai;

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
    "key3": "uniqueKey3",
    "profile_key": "profile_key",
  },
  {
    "country": COUNTRY,
    "key": uuid(),
    "body": "test",
    "key2": "key2",
    "key3": "key3",
    "profile_key": "profile_key",
    "range_key": 1,
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
            const encrypted = await storage._encryptPayload(testCase)
            const bodyObj = JSON.parse(body);
            expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
            done();
          } catch (e) {
            done(e)
          }
        });
      });
      it('should read a record', async function () {
        const encrypted = await storage._encryptPayload(testCase);
        nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${encrypted.key}`)
          .reply(200, encrypted);
        const {data} = await storage.readAsync(testCase);
        const expected = _.pick(testCase, ['key', 'body']);
        expect(data).to.deep.include(expected);
      })
      it('should delete a record', function (done) {
        storage._encryptPayload(testCase).then((encrypted) => {
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
    Promise.all(TEST_RECORDS.map((testCase) => storage._encryptPayload(testCase))).then((encrypted) => {
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
          expect(response.data).to.eql({GET: TEST_RECORDS})
          done()
        } catch (e) {
          done(e)
        }
      })
    })
  })
  it('should find by random key', async function () {
    const filter = {profile_key: TEST_RECORDS[4].profile_key}
    const options = {limit: 1, offset: 1}
    const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)))
    nock('https://us.api.incountry.io')
      .post(`/v2/storage/records/us/find`)
      .reply(200, (uri, requestBody) => {
        const filterKeys = Object.keys(requestBody.filter);
        const records =  encryptedRecords.filter((rec) => {
          for(let i = 0; i < filterKeys.length; i += 1) {
            if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
              return false
            }
          }
          return true
        })
        return {meta: {total: records.length}, data: records}
      });
    const rec = await storage.find('us', filter, options)
    expect(rec.data.length).to.eql(2)
  })
  it('should findOne by random key', async function () {
    const filter = {key3: TEST_RECORDS[4].key3}
    const options = {limit: 1, offset: 1}
    const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)))
    nock('https://us.api.incountry.io')
      .post(`/v2/storage/records/us/find`)
      .reply(200, (uri, requestBody) => {
        const filterKeys = Object.keys(requestBody.filter);
        const records = encryptedRecords.filter((rec) => {
          for(let i = 0; i < filterKeys.length; i += 1) {
            if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
              return false
            }
          }
          return true
        })
        return {meta: {total: records.length}, data: records}
      });
    const rec = await storage.findOne('us', filter, options)
    expect(rec).to.eql(TEST_RECORDS[4])
  })
  it('should update one by profile key', function (done) {
    const payload = {profile_key: 'updatedProfileKey'}
    storage._encryptPayload(TEST_RECORDS[4]).then((encrypted) => {
      nock('https://us.api.incountry.io')
        .post('/v2/storage/records/us/find')
        .reply(200, {data: [encrypted], meta: {total: 1}});
      const writeNock = nock('https://us.api.incountry.io')
        .post('/v2/storage/records/us')
        .reply(200, {data: [encrypted], meta: {total: 1}});
      writeNock.on('request', (req, interceptor, body) => {
        const expectedPlain = {
          ...TEST_RECORDS[4],
          ...payload,
        }
        storage._decryptPayload(JSON.parse(body)).then((decrypted) => {
          try {
            expect(decrypted).to.eql(expectedPlain)
            done()
          } catch (e) {
            done(e)
          }
        })
      })
      storage.updateOne('us', {profileKey: TEST_RECORDS[4].profileKey}, payload)
    })
  })
  context('exceptions', function () {
    context('updateOne', function () {
      it('should reject if too many records found', function (done) {
        nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us/find')
          .reply(200, {data: [], meta: {total: 2}});
        storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done())
      })
      it('should reject if no records found', function (done) {
        nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us/find')
          .reply(200, {data: [], meta: {total: 0}});
        storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done())
      })
    })
    context('delete', function () {
      it('should throw when invalid url', function (done) {
        const INVALID_KEY = 'invalid';
        nock('https://us.api.incountry.io')
          .delete(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(404);
        storage.deleteAsync({country: 'us', key: INVALID_KEY}).then(() => done('should be rejected')).catch(() => done())
      })
    })
    context('read', function () {
      it('should return error when not found', function (done) {
        const INVALID_KEY = 'invalid';
        const scope = nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(404);
        scope.on('error', done);
        storage.readAsync({country: 'us', key: INVALID_KEY})
          .then((res) => res.error ? done() : done('Should return error'))
          .catch(done)
      })
      it('should return error when server error', function (done) {
        const INVALID_KEY = 'invalid';
        const scope = nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(500);
        scope.on('error', done);
        storage.readAsync({country: 'us', key: INVALID_KEY})
          .then(() => done('Should return error'))
          .catch(() => done())
      })
    })
  })
})