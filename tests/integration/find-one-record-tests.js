/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const assert = require('assert');
const { AssertionError } = require('assert');
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

describe('Find one record', function () {
  before(async function () {
    storage = createStorage(false);
    await storage.writeAsync(dataRequest);
    // FIXME please delete written data after tests
  });

  it.skip('C1914 Find one record by country', async function () {
    // FIXME please make sure the tests are conducted using clean database/only records created during tests (for now)
    const findResponse = await storage.findOne(dataRequest.country, {});

    expect(findResponse).to.have.all.keys('body', 'key', 'key2', 'key3', 'profile_key', 'range_key', 'version');
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

  it('C19503 Record not found by key value', async function () {
    const findResponse = await storage.findOne('US', { key: 'NotExistingKey987' });
    expect(findResponse).to.equal(null);
  });

  it('C19504 Record not found by country', async function () {
    try {
      await storage.findOne('SE', {});
      assert.fail('expected exception not thrown');
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Request failed with status code 409');
    }
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
    const findResponse = await storage.findOne(encData.country, { key: encData.key });

    expect(findResponse.key).to.equal(encData.key);
    expect(findResponse.key2).to.equal(encData.key2);
    expect(findResponse.key3).to.equal(encData.key3);
    expect(findResponse.profile_key).to.equal(encData.profile_key);
    expect(findResponse.range_key).to.equal(encData.range_key);
    expect(findResponse.body).to.equal(encData.body);
  });
});
