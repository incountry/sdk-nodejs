/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');
const { StorageServerError } = require('../../errors');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;
const ANOTHER_COUNTRY = COUNTRY === 'us' ? 'se' : 'us';

/** @type {import('../../storage')} */
let storage;

const dataRequest = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1,
  body: JSON.stringify({ name: 'PersonName' }),
};

describe('Find one record', function () {
  before(async function () {
    storage = createStorage(false);
    await storage.writeAsync(COUNTRY, dataRequest);
  });

  after(async function () {
    await storage.deleteAsync(COUNTRY, dataRequest.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it.skip('Find one record by country', async function () {
        const { record } = await storage.findOne(COUNTRY, {});
        expect(record).to.have.all.keys('body', 'key', 'key2', 'key3', 'profile_key', 'range_key', 'version');
      });

      it('Find one record by key', async function () {
        const { record } = await storage.findOne(COUNTRY, { key: dataRequest.key });

        expect(record.key).to.equal(dataRequest.key);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profile_key).to.equal(dataRequest.profile_key);
        expect(record.range_key).to.equal(dataRequest.range_key);
        expect(record.body).to.equal(dataRequest.body);
      });

      it('Find one record by key2', async function () {
        const { record } = await storage.findOne(COUNTRY, { key2: dataRequest.key2 });

        expect(record.key).to.equal(dataRequest.key);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profile_key).to.equal(dataRequest.profile_key);
        expect(record.range_key).to.equal(dataRequest.range_key);
        expect(record.body).to.equal(dataRequest.body);
      });

      it('Find one record by key3', async function () {
        const { record } = await storage.findOne(COUNTRY, { key3: dataRequest.key3 });

        expect(record.key).to.equal(dataRequest.key);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profile_key).to.equal(dataRequest.profile_key);
        expect(record.range_key).to.equal(dataRequest.range_key);
        expect(record.body).to.equal(dataRequest.body);
      });

      it('Find one record by profile_key', async function () {
        const { record } = await storage.findOne(COUNTRY, { profile_key: dataRequest.profile_key });

        expect(record.key).to.equal(dataRequest.key);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profile_key).to.equal(dataRequest.profile_key);
        expect(record.range_key).to.equal(dataRequest.range_key);
        expect(record.body).to.equal(dataRequest.body);
      });

      it('Record not found by key value', async function () {
        const { record } = await storage.findOne(COUNTRY, { key: Math.random().toString(36).substr(2, 10) });
        expect(record).to.equal(null);
      });

      it('Record not found by country', async function () {
        await expect(storage.findOne(ANOTHER_COUNTRY, {})).to.be.rejectedWith(StorageServerError, 'Request failed with status code 409');
      });
    });
  });
});
