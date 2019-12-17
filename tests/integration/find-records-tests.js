/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

/** @type {import('../../storage')} */
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

const dataRequest2 = {
  country: 'us',
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1,
  body: JSON.stringify({ name: 'PersonName2' }),
};

describe('Find records', function () {
  before(async function () {
    await storage.writeAsync(dataRequest);
    await storage.writeAsync(dataRequest2);
  });

  after(async function () {
    await storage.deleteAsync({
      country: dataRequest.country,
      key: dataRequest.key,
    }).catch(noop);

    await storage.deleteAsync({
      country: dataRequest2.country,
      key: dataRequest2.key,
    }).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      // C1913
      it.skip('Find records by country', async function () {
        const { records, meta } = await storage.find(dataRequest.country, {}, {});

        expect(records).to.have.lengthOf.above(0);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C1926
      it('Find records by key', async function () {
        const { records, meta } = await storage.find(dataRequest.country, { key: dataRequest.key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key).to.equal(dataRequest.key);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C19493
      it('Find records by key2', async function () {
        const { records, meta } = await storage.find(dataRequest.country, { key2: dataRequest.key2 }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key).to.equal(dataRequest.key);
        expect(records[0].key2).to.equal(dataRequest.key2);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C19494
      it('Find records by key3', async function () {
        const { records, meta } = await storage.find(dataRequest.country, { key3: dataRequest.key3 }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key3).to.equal(dataRequest.key3);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C19495
      it.skip('Find records by profile_key', async function () {
        const { records, meta } = await storage.find(dataRequest.country, { profile_key: dataRequest.profile_key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].profile_key).to.equal(dataRequest.profile_key);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C19496
      it('Find record list of keys', async function () {
        const { records, meta } = await storage.find(dataRequest.country, { key2: [dataRequest.key2, dataRequest2.key2] }, {});

        expect(records).to.have.lengthOf(2);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(2);
        expect(meta.total).to.equal(2);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C1927
      it('Find records with pagination', async function () {
        const limit = 10;
        const offset = 10;
        const { records, meta } = await storage.find(dataRequest.country, { version: 0 },
          {
            limit,
            offset,
          });

        expect(records).to.be.lengthOf.above(2);
        expect(records).to.be.lengthOf.not.above(limit);

        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.be.not.above(limit);
        expect(meta.offset).to.equal(offset);
        expect(meta.limit).to.equal(limit);
      });

      // C1928
      it('Find records by filter with range_key', async function () {
        const { records, meta } = await storage.find(dataRequest.country,
          { range_key: { $gt: 100 }, version: 0 }, {});

        expect(records).to.have.lengthOf.above(0);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.offset).to.equal(0);
      });

      // C19498
      it('Records not found by key value', async function () {
        const { records, meta } = await storage.find('US', { key2: Math.random().toString(36).substr(2, 10) }, {});

        expect(records).to.have.lengthOf(0);
        expect(meta.count).to.equal(0);
        expect(meta.total).to.equal(0);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      // C19499
      it('Records not found by country', async function () {
        await expect(storage.findOne('SE', {}))
          .to.be.rejectedWith(Error, 'POST https://us.qa.incountry.io/v2/storage/records/se/find Request failed with status code 409');
      });
    });
  });
});
