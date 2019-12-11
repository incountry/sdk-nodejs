/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const assert = require('assert');
const { AssertionError } = require('assert');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
let storage;
let data;
let encData;

describe('Update record', function () {
  beforeEach(async function () {
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

  it('C19527 Update record with override', async function () {
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

  it('C19528 Update record with override by profile_key', async function () {
    const updatedData = {
      key: data.key,
      key2: 'UpdKey2',
      key3: `UpdKey3_${data.key3}`,
      profile_key: data.profile_key,
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

  it('C19529 Update record with override by key2', async function () {
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

  it('C19530 Update record without override', async function () {
    const updatedData = {
      key: data.key,
      key2: 'MergedKey2',
    };
    const updateResponse = await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: data.key });

    expect(readResponse.data.body).to.equal(data.body);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(data.key3);
  });

  it('C21799 Update record without override with body', async function () {
    const updatedData = {
      key: data.key,
      key2: 'MergedKey2',
      body: JSON.stringify({ UpdatedName: 'OverrideName' }),
    };
    const updateResponse = await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: data.country, key: data.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(data.key3);
  });

  it('C19531 Update not existing record', async function () {
    const updatedData = {
      key2: 'UpdKey2',
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };

    try {
      await storage.updateOne(data.country, { key: `NotExistingKey${Math.random().toString(36).substr(2, 10)}` }, updatedData, { override: true });
      assert.fail('expected exception not thrown');
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Record not found');
    }
  });

  it.skip('C19536 Filter return more than one records', async function () {
    // FIXME please create those records first
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key2: `UpdKey2_${data.key2}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };

    try {
      await storage.updateOne(data.country, { key2: 'recordKey13' }, updatedData, { override: false });
      assert.fail('expected exception not thrown');
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Multiple records found');
    }
  });
});

describe('Update encrypted records', function () {
  beforeEach(async () => {
    storage = createStorage(true);
    encData = {
      country: 'us',
      key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
      // key2: `EncKey2_${Math.random().toString(36).substr(2, 5)}`,
      key3: `EncKey3_${Math.random().toString(36).substr(2, 5)}`,
      profile_key: `EncPrfKey_${Math.random().toString(36).substr(2, 5)}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.writeAsync(encData);
  });

  it('C21800 Update encrypted records with override', async function () {
    const updatedData = {
      key: `UpdKey_${encData.key}`,
      key2: `UpdKey2_${encData.key2}`,
      key3: `UpdKey3_${encData.key3}`,
      profile_key: `UpdPrfKey_${encData.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };
    const updateResponse = await storage.updateOne(encData.country, { key: encData.key },
      updatedData, { override: true });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: encData.country, key: updatedData.key });

    expect(readResponse.data.body).to.equal(updatedData.body);
    expect(readResponse.data.key).to.equal(updatedData.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(updatedData.key3);
    expect(readResponse.data.profile_key).to.equal(updatedData.profile_key);
    expect(readResponse.data.range_key).to.equal(updatedData.range_key);
  });

  it('C21801 Update encrypted records without override', async function () {
    const updatedData = {
      key: encData.key,
      key2: 'MergedEncKey2',
    };
    const updateResponse = await storage.updateOne(encData.country, { key: encData.key },
      updatedData, { override: false });

    expect(updateResponse.status).to.equal(201);
    expect(updateResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({ country: encData.country, key: encData.key });

    expect(readResponse.data.body).to.equal(encData.body);
    expect(readResponse.data.key).to.equal(encData.key);
    expect(readResponse.data.key2).to.equal(updatedData.key2);
    expect(readResponse.data.key3).to.equal(encData.key3);
    expect(readResponse.data.profile_key).to.equal(encData.profile_key);
    expect(readResponse.data.range_key).to.equal(encData.range_key);
  });
});
