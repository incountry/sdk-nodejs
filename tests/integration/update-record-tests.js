/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const storageCommon = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const { createStorage } = storageCommon;
/** @type {import('../../storage')} */
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
    await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: true });

    const { record } = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(record.body).to.equal(updatedData.body);
    expect(record.key).to.equal(updatedData.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(updatedData.key3);
    expect(record.profile_key).to.equal(updatedData.profile_key);
    expect(record.range_key).to.equal(updatedData.range_key);
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
    await storage.updateOne(data.country, { profile_key: data.profile_key },
      updatedData, { override: true });

    const { record } = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(record.body).to.equal(updatedData.body);
    expect(record.key).to.equal(updatedData.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(updatedData.key3);
    expect(record.profile_key).to.equal(updatedData.profile_key);
    expect(record.range_key).to.equal(updatedData.range_key);
  });

  it('C19529 Update record with override by key2', async function () {
    const updatedData = {
      key: `UpdKey_${data.key}`,
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };

    await storage.updateOne(data.country, { key2: data.key2 },
      updatedData, { override: true });

    const { record } = await storage.readAsync({ country: data.country, key: updatedData.key });

    expect(record.body).to.equal(updatedData.body);
    expect(record.key).to.equal(updatedData.key);
    expect(record.key2).to.equal(null);
    expect(record.key3).to.equal(updatedData.key3);
    expect(record.profile_key).to.equal(updatedData.profile_key);
    expect(record.range_key).to.equal(updatedData.range_key);
  });

  it('C19530 Update record without override', async function () {
    const updatedData = {
      key: data.key,
      key2: 'MergedKey2',
    };

    await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    const { record } = await storage.readAsync({ country: data.country, key: data.key });

    expect(record.body).to.equal(data.body);
    expect(record.key).to.equal(data.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(data.key3);
  });

  it('C21799 Update record without override with body', async function () {
    const updatedData = {
      key: data.key,
      key2: 'MergedKey2',
      body: JSON.stringify({ UpdatedName: 'OverrideName' }),
    };

    await storage.updateOne(data.country, { key: data.key },
      updatedData, { override: false });

    const { record } = await storage.readAsync({ country: data.country, key: data.key });

    expect(record.body).to.equal(updatedData.body);
    expect(record.key).to.equal(data.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(data.key3);
  });

  it('C19531 Update not existing record', async function () {
    const updatedData = {
      key2: 'UpdKey2',
      key3: `UpdKey3_${data.key3}`,
      profile_key: `UpdPrfKey_${data.profile_key}`,
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ UpdatedName: 'UpdatedPersonName' }),
    };

    await expect(storage.updateOne(data.country, { key: `NotExistingKey${Math.random().toString(36).substr(2, 10)}` }, updatedData, { override: true }))
      .to.be.rejectedWith(Error, 'Record not found');
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

    await expect(storage.updateOne(data.country, { key2: 'recordKey13' }, updatedData, { override: false }))
      .to.be.rejectedWith(Error, 'Multiple records found');
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

    await storage.updateOne(encData.country, { key: encData.key },
      updatedData, { override: true });


    const { record } = await storage.readAsync({ country: encData.country, key: updatedData.key });

    expect(record.body).to.equal(updatedData.body);
    expect(record.key).to.equal(updatedData.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(updatedData.key3);
    expect(record.profile_key).to.equal(updatedData.profile_key);
    expect(record.range_key).to.equal(updatedData.range_key);
  });

  it('C21801 Update encrypted records without override', async function () {
    const updatedData = {
      key: encData.key,
      key2: 'MergedEncKey2',
    };

    await storage.updateOne(encData.country, { key: encData.key },
      updatedData, { override: false });


    const { record } = await storage.readAsync({ country: encData.country, key: encData.key });

    expect(record.body).to.equal(encData.body);
    expect(record.key).to.equal(encData.key);
    expect(record.key2).to.equal(updatedData.key2);
    expect(record.key3).to.equal(encData.key3);
    expect(record.profile_key).to.equal(encData.profile_key);
    expect(record.range_key).to.equal(encData.range_key);
  });
});
