const { expect } = require('chai');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
let storage;
let data;

describe('Update record', () => {
  beforeEach(async () => {
    storage = createStorage(false);

    data = {
      country: 'us',
      key: Math.random().toString(36).substr(2, 10),
      key3: Math.random().toString(36).substr(2, 10),
      profile_key: Math.random().toString(36).substr(2, 10),
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ name: 'PersonName' }),
    };

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

  it.skip('C19528 Update record with override by profile_key', async () => {
    const updatedData = {
      key: data.key,
      key2: 'UpdKey2',
      key3: `UpdKey3_${data.key3}`,
      profile_key: data.profile_key,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: data.body,
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

  it('C19529 Update record with override by key3', async () => {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key3: data.key3 },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    expect(readResponse.data.key2).to.equal(null);
    expect(readResponse.data.key3).to.equal(null);
    expect(readResponse.data.profile_key).to.equal(updatedData.profile_key);
    expect(readResponse.data.range_key).to.equal(updatedData.range_key);
  });

  it.skip('C19530 Update record without override', async () => {
    const updatedData = {
      key: data.key,
      key2: 'MergedKey2',
    };

    const updateResponse = await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: data.key });

    console.log(readResponse);
    expect(readResponse.data.body).to.equal(data.body);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
  });

  it.skip('C19531 Update not existing record', async () => {
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

  it.skip('C19536 Filter return more than one records', async () => {
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
