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

describe('Find records', function () {
  before(async function () {
    storage = createStorage(false);
    await storage.writeAsync(dataRequest);
  });

  it.skip('C1913 Find records by country', async function () {
    // FIXME please make sure the tests are conducted using clean database/only records created during tests (for now)
    const findResponse = await storage.find(dataRequest.country, {}, {});

    expect(findResponse.data).to.have.lengthOf.above(0);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C1926 Find records by key', async function () {
    const findResponse = await storage.find(dataRequest.country, { key: dataRequest.key }, {});

    expect(findResponse.data).to.have.lengthOf(1);
    expect(findResponse.data[0].key).to.equal(dataRequest.key);
    expect(findResponse.data[0].body).to.equal(dataRequest.body);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(1);
    expect(findResponse.meta.total).to.equal(1);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C19493 Find records by key2', async function () {
    const findResponse = await storage.find(dataRequest.country, { key2: dataRequest.key2 }, {});

    expect(findResponse.data).to.have.lengthOf(1);
    expect(findResponse.data[0].key).to.equal(dataRequest.key);
    expect(findResponse.data[0].key2).to.equal(dataRequest.key2);
    expect(findResponse.data[0].body).to.equal(dataRequest.body);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(1);
    expect(findResponse.meta.total).to.equal(1);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C19494 Find records by key3', async function () {
    const findResponse = await storage.find(dataRequest.country, { key3: dataRequest.key3 }, {});

    expect(findResponse.data).to.have.lengthOf(1);
    expect(findResponse.data[0].key3).to.equal(dataRequest.key3);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(1);
    expect(findResponse.meta.total).to.equal(1);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C19495 Find records by profile_key', async function () {
    const findResponse = await storage.find(dataRequest.country, { profile_key: dataRequest.profile_key }, {});

    expect(findResponse.data).to.have.lengthOf(1);
    expect(findResponse.data[0].profile_key).to.equal(dataRequest.profile_key);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(1);
    expect(findResponse.meta.total).to.equal(1);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C19496 Find record list of keys', async function () {
    const dataRequest2 = {
      country: 'us',
      key: Math.random().toString(36).substr(2, 10),
      key2: Math.random().toString(36).substr(2, 10),
      key3: Math.random().toString(36).substr(2, 10),
      profile_key: Math.random().toString(36).substr(2, 10),
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ name: 'PersonName' }),
    };
    await storage.writeAsync(dataRequest2);

    const findResponse = await storage.find(dataRequest.country, { key2: [dataRequest.key2, dataRequest2.key2] }, {});

    expect(findResponse.data).to.have.lengthOf(2);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(2);
    expect(findResponse.meta.total).to.equal(2);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it.skip('C1927 Find records with pagination', async function () {
    // FIXME please create the records first
    const limit = 10;
    const offset = 10;
    const findResponse = await storage.find(dataRequest.country, {},
      {
        limit,
        offset,
      });

    expect(findResponse.data).to.have.lengthOf(limit);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(limit);
    expect(findResponse.meta.offset).to.equal(offset);
    expect(findResponse.meta.limit).to.equal(limit);
  });

  it('C1928 Find records by filter with range_key', async function () {
    const findResponse = await storage.find(dataRequest.country,
      { range_key: { $lt: 1000 } }, {});

    expect(findResponse.data).to.have.lengthOf.above(0);
    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.offset).to.equal(0);
  });

  it('C19498 Records not found by key value', async function () {
    const findResponse = await storage.find('US', { key2: 'NotExistingKey212341' }, {});

    expect(findResponse.data).to.have.lengthOf(0);
    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.meta.count).to.equal(0);
    expect(findResponse.meta.total).to.equal(0);
    expect(findResponse.meta.offset).to.equal(0);
    expect(findResponse.meta.limit).to.equal(100);
  });

  it('C19499 Records not found by country', async function () {
    try {
      await storage.find('SE', {}, {});
      assert.fail('expected exception not thrown');
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Request failed with status code 409');
    }
  });
});

describe('Find encrypted records', () => {
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

  it('C1945 Find encrypted records by key', async () => {
    const findResponse = await storage.find(encData.country, { key: encData.key });

    expect(findResponse.data).to.have.lengthOf(1);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data[0].key).to.equal(encData.key);
  });

  it.skip('C21798 Find encrypted records by country', async () => {
    const findResponse = await storage.find(encData.country, {}, {});

    expect(findResponse.data).to.have.lengthOf.above(0);

    expect(findResponse.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
  });
});
