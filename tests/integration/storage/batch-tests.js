const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
let storage;
let data;

describe('Batch', () => {
  before(async () => {
    storage = createStorage(false);

    data = {
      country: 'us',
      key: Math.random().toString(36).substr(2, 10),
      key2: Math.random().toString(36).substr(2, 10),
      key3: Math.random().toString(36).substr(2, 10),
      profile_key: Math.random().toString(36).substr(2, 10),
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.writeAsync(data);
  });

  it('C1917 Get batches of records', async () => {
    const batchResponse = await storage.batchAsync({
      country: data.country,
      GET: [
        data.key,
      ],
    });

    expect(batchResponse.status).to.equal(201);
    expect(batchResponse.data).to.have.all.keys('DELETE', 'GET', 'POST');

    expect(batchResponse.data.GET).to.have.lengthOf(1);
    expect(batchResponse.data.GET[0].key).to.equal(data.key);
    expect(batchResponse.data.GET[0].key2).to.equal(data.key2);
    expect(batchResponse.data.GET[0].key3).to.equal(data.key3);
    expect(batchResponse.data.GET[0].profile_key).to.equal(data.profile_key);
    expect(batchResponse.data.GET[0].range_key).to.equal(data.range_key);
  });
});
