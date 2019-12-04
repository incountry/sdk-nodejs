/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
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

describe.skip('Find one record', function () {
  before(async function () {
    storage = createStorage(false);
    await storage.writeAsync(dataRequest);
  });

  it('C1914 Find one record by country', async function () {
    const findResponse = await storage.findOne(dataRequest.country, {});

    expect(findResponse).to.have.all.keys('body', 'key', 'key2', 'key3', 'profile_key', 'range_key');
  });

  it('C1925 Find one record by key', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { key: dataRequest.key });

    expect(findResponse.key).to.equal(dataRequest.key);
    expect(findResponse.key2).to.equal(dataRequest.key2);
    expect(findResponse.key3).to.equal(dataRequest.key3);
    expect(findResponse.profile_key).to.equal(dataRequest.profile_key);
    expect(findResponse.range_key).to.equal(dataRequest.range_key);
    expect(findResponse.body).to.equal(dataRequest.body);
  });

  it('C19500 Find one record by key2', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { key2: dataRequest.key2 });

    expect(findResponse.key).to.equal(dataRequest.key);
    expect(findResponse.key2).to.equal(dataRequest.key2);
    expect(findResponse.key3).to.equal(dataRequest.key3);
    expect(findResponse.profile_key).to.equal(dataRequest.profile_key);
    expect(findResponse.range_key).to.equal(dataRequest.range_key);
    expect(findResponse.body).to.equal(dataRequest.body);
  });

  it('C19501 Find one record by key3', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { key3: dataRequest.key3 });

    expect(findResponse.key).to.equal(dataRequest.key);
    expect(findResponse.key2).to.equal(dataRequest.key2);
    expect(findResponse.key3).to.equal(dataRequest.key3);
    expect(findResponse.profile_key).to.equal(dataRequest.profile_key);
    expect(findResponse.range_key).to.equal(dataRequest.range_key);
    expect(findResponse.body).to.equal(dataRequest.body);
  });

  it('C19502 Find one record by profile_key', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { profile_key: dataRequest.profile_key });

    expect(findResponse.key).to.equal(dataRequest.key);
    expect(findResponse.key2).to.equal(dataRequest.key2);
    expect(findResponse.key3).to.equal(dataRequest.key3);
    expect(findResponse.profile_key).to.equal(dataRequest.profile_key);
    expect(findResponse.range_key).to.equal(dataRequest.range_key);
    expect(findResponse.body).to.equal(dataRequest.body);
  });

  it.skip('C19503 Record not found by key value', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { key: 'NotExistingKey987' });
    expect(findResponse.status).to.equal(404);
  });

  it.skip('C19504 Record not found by country', async function () {
    const findResponse = await storage.findOne('BR', {});
    expect(findResponse.status).to.equal(404);
  });
});

describe.skip('Find encrypted record', function () {
  const encData = {
    country: 'us',
    key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
    key2: `EncKey2_${Math.random().toString(36).substr(2, 5)}`,
    key3: `EncKey3_${Math.random().toString(36).substr(2, 5)}`,
    profile_key: `EncPrfKey_${Math.random().toString(36).substr(2, 5)}`,
    range_key: Math.floor(Math.random() * 100) + 1,
    body: JSON.stringify({ name: 'PersonName' }),
  };

  before(async function () {
    storage = createStorage(true);
    await storage.writeAsync(encData);
  });

  it('C19505 Find one encrypted record by key', async function () {
    const findResponse = await storage.findOne(dataRequest.country, { key: encData.key });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key).to.equal(dataRequest.key);
  });
});
