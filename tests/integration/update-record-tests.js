/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

/** @type {import('../../storage')} */
let storage;
let data;

describe('Update record', function () {
  beforeEach(async function () {
    data = {
      country: COUNTRY,
      key: Math.random().toString(36).substr(2, 10),
      key3: Math.random().toString(36).substr(2, 10),
      profile_key: Math.random().toString(36).substr(2, 10),
      range_key: Math.floor(Math.random() * 100) + 1,
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.writeAsync(data);
  });

  afterEach(async function () {
    await storage.deleteAsync({
      country: data.country,
      key: data.key,
    }).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it('Update record with override', async function () {
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

      it('Update record with override by profile_key', async function () {
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

      it('Update record with override by key2', async function () {
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

      it('Update record without override', async function () {
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

      it('Update record without override with body', async function () {
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

      it('Update not existing record', async function () {
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

      it.skip('Filter return more than one records', async function () {
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
  });
});
