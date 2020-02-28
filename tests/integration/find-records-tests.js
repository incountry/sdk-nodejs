/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;
const ANOTHER_COUNTRY = COUNTRY === 'us' ? 'se' : 'us';

/** @type {import('../../storage')} */
let storage;

const dataRequest = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 100,
  body: JSON.stringify({ name: 'PersonName' }),
};

const dataRequest2 = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 100,
  body: JSON.stringify({ name: 'PersonName2' }),
};

describe('Find records', function () {
  after(async function () {
    await storage.delete(COUNTRY, dataRequest.key).catch(noop);
    await storage.delete(COUNTRY, dataRequest2.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      before(async function () {
        storage = await createStorage(encryption);
        await storage.write(COUNTRY, dataRequest);
        await storage.write(COUNTRY, dataRequest2);
      });

      it.skip('Find records by country', async function () {
        const { records, meta } = await storage.find(COUNTRY, {}, {});

        expect(records).to.have.lengthOf.above(0);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records by key', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key: dataRequest.key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key).to.equal(dataRequest.key);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records by key2', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key2: dataRequest.key2 }, {});

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

      it('Find records by key3', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key3: dataRequest.key3 }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key3).to.equal(dataRequest.key3);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it.skip('Find records by profile_key', async function () {
        const { records, meta } = await storage.find(COUNTRY, { profile_key: dataRequest.profile_key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].profile_key).to.equal(dataRequest.profile_key);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find record list of keys', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key2: [dataRequest.key2, dataRequest2.key2] }, {});

        expect(records).to.have.lengthOf(2);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(2);
        expect(meta.total).to.equal(2);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records with pagination', async function () {
        const limit = 10;
        const offset = 1;
        const { records, meta } = await storage.find(COUNTRY, { version: 0 },
          {
            limit,
            offset,
          });

        expect(records).to.be.lengthOf.above(1);
        expect(records).to.be.lengthOf.not.above(limit);

        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.be.not.above(limit);
        expect(meta.offset).to.equal(offset);
        expect(meta.limit).to.equal(limit);
      });

      it('Find records by filter with range_key', async function () {
        const { records, meta } = await storage.find(COUNTRY,
          { range_key: { $gt: 100 }, version: 0 }, {});

        expect(records).to.have.lengthOf.above(0);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.offset).to.equal(0);
      });

      it('Records not found by key value', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key2: Math.random().toString(36).substr(2, 10) }, {});

        expect(records).to.have.lengthOf(0);
        expect(meta.count).to.equal(0);
        expect(meta.total).to.equal(0);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Records not found by country', async function () {
        await expect(storage.findOne(ANOTHER_COUNTRY, {}))
          .to.be.rejectedWith(Error, 'Request failed with status code 409');
      });
    });
  });
});
