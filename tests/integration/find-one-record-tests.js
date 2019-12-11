/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');
const { StorageServerError } = require('../../errors');

chai.use(chaiAsPromised);
const { expect } = chai;

/** @type {import('../../storage')} */
let storage;

const dataRequest = {
  country: 'us',
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
    await storage.writeAsync(dataRequest);
  });

  it('C1914 Find one record by country', async function () {
    const { record } = await storage.findOne(dataRequest.country, {});

    expect(record).to.have.all.keys('body', 'key', 'key2', 'key3', 'profile_key', 'range_key', 'version');
  });

  it('C1925 Find one record by key', async function () {
    const { record } = await storage.findOne(dataRequest.country, { key: dataRequest.key });

    expect(record.key).to.equal(dataRequest.key);
    expect(record.key2).to.equal(dataRequest.key2);
    expect(record.key3).to.equal(dataRequest.key3);
    expect(record.profile_key).to.equal(dataRequest.profile_key);
    expect(record.range_key).to.equal(dataRequest.range_key);
    expect(record.body).to.equal(dataRequest.body);
  });

  it('C19500 Find one record by key2', async function () {
    const { record } = await storage.findOne(dataRequest.country, { key2: dataRequest.key2 });

    expect(record.key).to.equal(dataRequest.key);
    expect(record.key2).to.equal(dataRequest.key2);
    expect(record.key3).to.equal(dataRequest.key3);
    expect(record.profile_key).to.equal(dataRequest.profile_key);
    expect(record.range_key).to.equal(dataRequest.range_key);
    expect(record.body).to.equal(dataRequest.body);
  });

  it('C19501 Find one record by key3', async function () {
    const { record } = await storage.findOne(dataRequest.country, { key3: dataRequest.key3 });

    expect(record.key).to.equal(dataRequest.key);
    expect(record.key2).to.equal(dataRequest.key2);
    expect(record.key3).to.equal(dataRequest.key3);
    expect(record.profile_key).to.equal(dataRequest.profile_key);
    expect(record.range_key).to.equal(dataRequest.range_key);
    expect(record.body).to.equal(dataRequest.body);
  });

  it('C19502 Find one record by profile_key', async function () {
    const { record } = await storage.findOne(dataRequest.country, { profile_key: dataRequest.profile_key });

    expect(record.key).to.equal(dataRequest.key);
    expect(record.key2).to.equal(dataRequest.key2);
    expect(record.key3).to.equal(dataRequest.key3);
    expect(record.profile_key).to.equal(dataRequest.profile_key);
    expect(record.range_key).to.equal(dataRequest.range_key);
    expect(record.body).to.equal(dataRequest.body);
  });

  it('C19503 Record not found by key value', async function () {
    const { record } = await storage.findOne('US', { key: Math.random().toString(36).substr(2, 10) });
    expect(record).to.equal(null);
  });

  it('C19504 Record not found by country', async function () {
    await expect(storage.findOne('SE', {})).to.be.rejectedWith(StorageServerError, 'Request failed with status code 409');
  });
});

describe('Find encrypted record', () => {
  const encData = {
    country: 'us',
    key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
    key2: `EncKey2_${Math.random().toString(36).substr(2, 5)}`,
    key3: `EncKey3_${Math.random().toString(36).substr(2, 5)}`,
    profile_key: `EncPrfKey_${Math.random().toString(36).substr(2, 5)}`,
    range_key: Math.floor(Math.random() * 100) + 1,
    body: JSON.stringify({ name: 'PersonName' }),
  };

  before(async () => {
    storage = createStorage(true);
    await storage.writeAsync(encData);
  });

  it('C19505 Find one encrypted record by key', async () => {
    const { record } = await storage.findOne(encData.country, { key: encData.key });

    expect(record.key).to.equal(encData.key);
    expect(record.key2).to.equal(encData.key2);
    expect(record.key3).to.equal(encData.key3);
    expect(record.profile_key).to.equal(encData.profile_key);
    expect(record.range_key).to.equal(encData.range_key);
    expect(record.body).to.equal(encData.body);
  });
});
