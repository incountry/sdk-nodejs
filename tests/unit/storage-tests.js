/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const nock = require('nock');
const uuid = require('uuid/v4');
const _ = require('lodash');
const Storage = require('../../storage');
const SecretKeyAccessor = require('../../secret-key-accessor');

const { expect } = chai;

const COUNTRY = 'us';
const SECRET_KEY = 'password';


const TEST_RECORDS = [
  { country: COUNTRY, key: uuid() },
  { country: COUNTRY, key: uuid(), body: 'test' },
  {
    country: COUNTRY, key: uuid(), body: 'test', key2: 'key2',
  },
  {
    country: COUNTRY, key: uuid(), body: 'test', key2: 'key2', key3: 'key3',
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'uniqueKey3',
    profile_key: 'profile_key',
  },
  {
    country: COUNTRY,
    key: uuid(),
    body: 'test',
    key2: 'key2',
    key3: 'key3',
    profile_key: 'profile_key',
    range_key: 1,
  },
];

describe('Storage', function () {
  let storage;
  beforeEach(function () {
    storage = new Storage({
      apiKey: 'string',
      environmentId: 'string',
      endpoint: 'https://us.api.incountry.io',
    },
    new SecretKeyAccessor(() => SECRET_KEY));
  });
  TEST_RECORDS.forEach((testCase, idx) => {
    context(`with test case ${idx}`, function () {
      it('should write a record', function (done) {
        const scope = nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us')
          .reply(200);
        storage.writeAsync(testCase);
        scope.on('request', async (req, interceptor, body) => {
          try {
            const encrypted = await storage._encryptPayload(testCase);
            const bodyObj = JSON.parse(body);
            expect(_.omit(bodyObj, ['body'])).to.deep.equal(_.omit(encrypted, ['body']));
            done();
          } catch (e) {
            done(e);
          }
        });
      });
      it('should read a record', async function () {
        const encrypted = await storage._encryptPayload(testCase);
        nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${encrypted.key}`)
          .reply(200, encrypted);
        const { data } = await storage.readAsync(testCase);
        const expected = _.pick(testCase, ['key', 'body']);
        expect(data).to.deep.include(expected);
      });
      it('should delete a record', function (done) {
        storage._encryptPayload(testCase).then((encrypted) => {
          const scope = nock('https://us.api.incountry.io')
            .delete(`/v2/storage/records/us/${encrypted.key}`)
            .reply(200);
          storage.deleteAsync(testCase);
          scope.on('error', done);
          scope.on('request', () => done());
        }).catch(done);
      });
    });
  });
  it('should find by random key', async function () {
    const filter = { profile_key: TEST_RECORDS[4].profile_key };
    const options = { limit: 1, offset: 1 };
    const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)));
    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, (uri, requestBody) => {
        const filterKeys = Object.keys(requestBody.filter);
        const records = encryptedRecords.filter((rec) => {
          for (let i = 0; i < filterKeys.length; i += 1) {
            if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
              return false;
            }
          }
          return true;
        });
        return { meta: { total: records.length }, data: records };
      });
    const rec = await storage.find('us', filter, options);
    expect(rec.data.length).to.eql(2);
  });
  it('should findOne by random key', async function () {
    const filter = { key3: TEST_RECORDS[4].key3 };
    const options = { limit: 1, offset: 1 };
    const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => storage._encryptPayload(record)));
    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, (uri, requestBody) => {
        const filterKeys = Object.keys(requestBody.filter);
        const records = encryptedRecords.filter((rec) => {
          for (let i = 0; i < filterKeys.length; i += 1) {
            if (rec[filterKeys[i]] !== requestBody.filter[filterKeys[i]]) {
              return false;
            }
          }
          return true;
        });
        return { meta: { total: records.length }, data: records };
      });
    const rec = await storage.findOne('us', filter, options);
    expect(rec).to.eql(TEST_RECORDS[4]);
  });
  it('should find an encrypted records', async function () {
    const encryptedStorage = new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: true,
      endpoint: 'https://us.api.incountry.io',
    },
    new SecretKeyAccessor(() => SECRET_KEY));

    const storedData = await Promise.all(
      TEST_RECORDS.map((record) => encryptedStorage._encryptPayload(record)),
    );

    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, { meta: { total: storedData.length }, data: storedData });

    const responseEncrypted = await encryptedStorage.find('us', { key: 'key1' });

    responseEncrypted.data.forEach((record, idx) => {
      ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
        if (record[key]) {
          expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
        }
      });
    });
  });
  it('should find not encrypted records', async function () {
    const notEncryptedStorage = new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: false,
      endpoint: 'https://us.api.incountry.io',
    },
    null);
    const storedData = await Promise.all(
      TEST_RECORDS.map((record) => notEncryptedStorage._encryptPayload(record)),
    );

    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, { meta: { total: storedData.length }, data: storedData });

    const responseNotEncrypted = await notEncryptedStorage.find('us', { key: 'key1' });

    responseNotEncrypted.data.forEach((record, idx) => {
      ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
        if (record[key]) {
          expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
        }
      });
    });
  });
  it('should not throw if some records cannot be decrypted', async function () {
    const encryptedStorage = new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: true,
      endpoint: 'https://us.api.incountry.io',
    },
    new SecretKeyAccessor(() => SECRET_KEY));

    const encryptedData = await Promise.all(
      TEST_RECORDS.map((record) => encryptedStorage._encryptPayload(record)),
    );

    const unsupportedData = {
      country: 'us',
      key: 'somekey',
      body: '2:unsupported data',
    };

    const data = [...encryptedData, unsupportedData];
    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, { meta: { total: data.length }, data });

    const response = await encryptedStorage.find('us', {});
    response.data.forEach((record, idx) => {
      ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
        if (record[key]) {
          expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
        }
      });
    });
    expect(response).to.have.property('errors');
    expect(response.errors.length).to.eql(1);
    expect(response.errors[0]).to.have.property('error');
    expect(response.errors[0]).to.have.property('rawData');
    expect(response.errors[0].rawData).to.eql(unsupportedData);
  });

  it('find() in non-encrypted mode should not throw error if some records are encrypted', async () => {
    const nonEncryptedStorage = new Storage({
      apiKey: 'string',
      environmentId: 'string',
      encrypt: false,
      endpoint: 'https://us.api.incountry.io',
    },
    new SecretKeyAccessor(() => SECRET_KEY));

    const nonEncryptedData = await Promise.all(
      TEST_RECORDS.map((record) => nonEncryptedStorage._encryptPayload(record)),
    );

    const unsupportedData = {
      country: 'us',
      key: 'somekey',
      body: '2:unsupported data',
    };

    const data = [...nonEncryptedData, unsupportedData];
    nock('https://us.api.incountry.io')
      .post('/v2/storage/records/us/find')
      .reply(200, { meta: { total: data.length }, data });

    const response = await nonEncryptedStorage.find('us', {});
    response.data.forEach((record, idx) => {
      ['body', 'key', 'key2', 'key3', 'profile_key'].forEach((key) => {
        if (record[key]) {
          expect(record[key]).to.eql(TEST_RECORDS[idx][key]);
        }
      });
    });
    expect(response).to.have.property('errors');
    expect(response.errors.length).to.eql(1);
    expect(response.errors[0]).to.have.property('error');
    expect(response.errors[0]).to.have.property('rawData');
    expect(response.errors[0].rawData).to.eql(unsupportedData);
    expect(response.errors[0].error).to.eql('No secretKeyAccessor provided. Cannot decrypt encrypted data');
  });

  it('should update one by profile key', function (done) {
    const payload = { profile_key: 'updatedProfileKey' };
    storage._encryptPayload(TEST_RECORDS[4]).then((encrypted) => {
      nock('https://us.api.incountry.io')
        .post('/v2/storage/records/us/find')
        .reply(200, { data: [encrypted], meta: { total: 1 } });
      const writeNock = nock('https://us.api.incountry.io')
        .post('/v2/storage/records/us')
        .reply(200, { data: [encrypted], meta: { total: 1 } });
      writeNock.on('request', (req, interceptor, body) => {
        const expectedPlain = {
          ...TEST_RECORDS[4],
          ...payload,
        };
        storage._decryptPayload(JSON.parse(body)).then((decrypted) => {
          try {
            expect(decrypted).to.eql(expectedPlain);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
      storage.updateOne('us', { profileKey: TEST_RECORDS[4].profileKey }, payload);
    });
  });
  context('exceptions', function () {
    context('updateOne', function () {
      it('should reject if too many records found', function (done) {
        nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us/find')
          .reply(200, { data: [], meta: { total: 2 } });
        storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done());
      });
      it('should reject if no records found', function (done) {
        nock('https://us.api.incountry.io')
          .post('/v2/storage/records/us/find')
          .reply(200, { data: [], meta: { total: 0 } });
        storage.updateOne('us', {}, {}).then(() => done('Should reject')).catch(() => done());
      });
    });
    context('delete', function () {
      it('should throw when invalid url', function (done) {
        const INVALID_KEY = 'invalid';
        nock('https://us.api.incountry.io')
          .delete(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(404);
        storage.deleteAsync({ country: 'us', key: INVALID_KEY }).then(() => done('should be rejected')).catch(() => done());
      });
    });
    context('read', function () {
      it('should return error when not found', function (done) {
        const INVALID_KEY = 'invalid';
        const scope = nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(404);
        scope.on('error', done);
        storage.readAsync({ country: 'us', key: INVALID_KEY })
          .then((res) => (res.error ? done() : done('Should return error')))
          .catch(done);
      });
      it('should return error when server error', function (done) {
        const INVALID_KEY = 'invalid';
        const scope = nock('https://us.api.incountry.io')
          .get(`/v2/storage/records/us/${storage.createKeyHash(INVALID_KEY)}`)
          .reply(500);
        scope.on('error', done);
        storage.readAsync({ country: 'us', key: INVALID_KEY })
          .then(() => done('Should return error'))
          .catch(() => done());
      });
    });
  });
});
