const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
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

describe.skip('Find one record', () => {
  before(async () => {
    storage = createStorage(false);
    await storage.writeAsync(dataRequest);
  });

  it('C1914 Find one record by country', async () => {
    const findResponse = await storage.findOne(dataRequest.country, {});

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    // expect(findResponse.data.data[0].key).to.equal(dataRequest.key);
  });

  it('C1925 Find one record by key', async () => {
    const findResponse = await storage.findOne(dataRequest.country, { key: dataRequest.key });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key).to.equal(dataRequest.key);
  });

  it('C19500 Find one record by key2', async () => {
    const findResponse = await storage.findOne(dataRequest.country, { key2: dataRequest.key2 });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key2).to.equal(dataRequest.key2);
  });

  it('C19501 Find one record by key3', async () => {
    const findResponse = await storage.findOne(dataRequest.country, { key3: dataRequest.key3 });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key3).to.equal(dataRequest.key3);
  });

  it('C19502 Find one record by profile_key', async () => {
    const findResponse = await storage.findOne(dataRequest.country, { profile_key: dataRequest.profile_key });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].profile_key).to.equal(dataRequest.profile_key);
  });

  it('C19503 Record not found by key value', async () => {
    const findResponse = await storage.findOne(dataRequest.country, { key: 'NotExistingKey987' });
    expect(findResponse.status).to.equal(404);
  });

  it('C19504 Record not found by country', async () => {
    const findResponse = await storage.findOne('BR', {});
    expect(findResponse.status).to.equal(404);
  });
});

describe.skip('Find encrypted record', () => {
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
    const findResponse = await storage.findOne(dataRequest.country, { key: encData.key });

    expect(findResponse.status).to.equal(200);
    expect(findResponse.data.data).to.have.lengthOf(1);
    expect(findResponse.data.data[0].key).to.equal(dataRequest.key);
  });
});
