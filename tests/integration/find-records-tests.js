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

describe('Find records', function () {
  before(async function () {
    storage = createStorage(false);
    await storage.writeAsync(dataRequest);
  });

  it('C1913 Find records by country', async function () {
    const findResponse = await storage.find(dataRequest.country, {}, {});

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf.above(0);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it('C1926 Find records by key', async function () {
    const findResponse = await storage.find('US', { key: dataRequest.key }, {});

    expect(findResponse.status).to.equal(200);

    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key).to.equal(dataRequest.key);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(1);
    expect(findResponse.data.meta.total).to.equal(1);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it('C19493 Find records by key2', async function () {
    const findResponse = await storage.find('US', { key2: dataRequest.key2 }, {});

    expect(findResponse.status).to.equal(200);

    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key2).to.equal(dataRequest.key2);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(1);
    expect(findResponse.data.meta.total).to.equal(1);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it('C19494 Find records by key3', async function () {
    const findResponse = await storage.find('US', { key3: dataRequest.key3 }, {});

    expect(findResponse.status).to.equal(200);

    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key3).to.equal(dataRequest.key3);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(1);
    expect(findResponse.data.meta.total).to.equal(1);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it('C19495 Find records by profile_key', async function () {
    const findResponse = await storage.find('US', { profile_key: dataRequest.profile_key }, {});

    expect(findResponse.status).to.equal(200);

    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].profile_key).to.equal(dataRequest.profile_key);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(1);
    expect(findResponse.data.meta.total).to.equal(1);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
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

    const findResponse = await storage.find('US', { key2: [dataRequest.key2, dataRequest2.key2] }, {});

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(2);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(2);
    expect(findResponse.data.meta.total).to.equal(2);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it('C1927 Find records with pagination', async function () {
    const limit = 10;
    const offset = 10;
    const findResponse = await storage.find(dataRequest.country, {},
      {
        limit,
        offset,
      });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(limit);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(limit);
    expect(findResponse.data.meta.offset).to.equal(offset);
    expect(findResponse.data.meta.limit).to.equal(limit);
  });

  it('C1928 Find records by filter with range_key', async function () {
    const findResponse = await storage.find('US',
      { range_key: { $lt: 1000 } }, {});

    expect(findResponse.status).to.equal(200);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.offset).to.equal(0);
  });

  it('C19498 Records not found by key value', async function () {
    const findResponse = await storage.find('US', { key2: 'NotExistingKey212341' }, {});

    expect(findResponse.data.data).to.have.lengthOf(0);
    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.meta.count).to.equal(0);
    expect(findResponse.data.meta.total).to.equal(0);
    expect(findResponse.data.meta.offset).to.equal(0);
    expect(findResponse.data.meta.limit).to.equal(100);
  });

  it.skip('C19499 Records not found by country', async function () {
    const findResponse = await storage.find('PT', {}, {});
    console.log(findResponse);
    // expect(findResponse.status).to.equal(404);
  });
});

describe.skip('Find encrypted records', function () {
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

  it('C1945 Find encrypted records', async function () {
    const findResponse = await storage.find(dataRequest.country, { key: encData.key });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);

    expect(findResponse.data.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(findResponse.data.data[0].key).to.equal(dataRequest.key);
  });
});
