const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
let storage;

const data = {
  country: 'us',
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1,
  body: JSON.stringify({ name: 'PersonName' }),
};

describe('Update record', () => {
  beforeEach(async () => {
    storage = createStorage(false);
    await storage.writeAsync(data);
  });

  it('C19527 Update record with override', async () => {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(updatedData.key3);
    expect(readResponse.data.profile_key).to.equal(updatedData.profile_key);
    expect(readResponse.data.range_key).to.equal(updatedData.range_key);
  });

  it('C19528 Update record with override by profile_key', async () => {
    const updatedData = {
      key: data.key,
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { profile_key: data.profile_key },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(updatedData.key3);
    expect(readResponse.data.profile_key).to.equal(updatedData.profile_key);
    expect(readResponse.data.range_key).to.equal(updatedData.range_key);
  });

  it('C19529 Update record with override by key2', async () => {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key2: data.key2 },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    expect(readResponse.data.key2).to.equal(null);
    expect(readResponse.data.key3).to.equal(updatedData.key3);
    expect(readResponse.data.profile_key).to.equal(updatedData.profile_key);
    expect(readResponse.data.range_key).to.equal(updatedData.range_key);
  });

  it('C19530 Update record without override', async () => {
    const updatedData = {
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      // body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: data.key });

    console.log(readResponse);
    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    // TODO: Add merge validation
  });

  it('C19531 Update not existing record', async () => {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key: `NotExistingKey${Math.random().toString(36).substr(2, 10)}` },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(400);
    expect(updateResponse.data).to.equal('Error');
  });

  it('C19536 Filter return more than one records', async () => {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key: 'recordKey0' },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(400);
    expect(updateResponse.data).to.equal('Error');
  });
});
