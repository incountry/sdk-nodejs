/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

/** @type {import('../../storage')} */
let storage;

const dataRequest = {
  key: Math.random().toString(36).substr(2, 10).toUpperCase(),
  key2: Math.random().toString(36).substr(2, 10).toUpperCase(),
  key3: Math.random().toString(36).substr(2, 10).toUpperCase(),
  profile_key: Math.random().toString(36).substr(2, 10).toUpperCase(),
  range_key: Math.floor(Math.random() * 100) + 1,
  body: JSON.stringify({ name: 'PersonName' }),
};

describe('Normolize keys records', function () {
  before(async function () {
    await storage.write(COUNTRY, dataRequest);
  });

  after(async function () {
    await storage.delete(COUNTRY, dataRequest.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption, true);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it('Find records by key with lower case', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key: dataRequest.key.toLowerCase() }, {});
        const records2 = await storage.find(COUNTRY, { key: dataRequest.key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key).to.equal(dataRequest.key);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);

        expect(records2.records).to.have.lengthOf(1);
        expect(records2.records[0].key).to.equal(dataRequest.key);
        expect(records2.records[0].body).to.equal(dataRequest.body);
        expect(records2.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(records2.meta.count).to.equal(1);
        expect(records2.meta.total).to.equal(1);
        expect(records2.meta.offset).to.equal(0);
        expect(records2.meta.limit).to.equal(100);
      });

      it('Find records by key2', async function () {
        const { records, meta } = await storage.find(COUNTRY, { key2: dataRequest.key2.toLowerCase() }, {});

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
        const { records, meta } = await storage.find(COUNTRY, { key3: dataRequest.key3.toLowerCase() }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key3).to.equal(dataRequest.key3);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records by profile_key', async function () {
        const { records, meta } = await storage.find(COUNTRY, { profile_key: dataRequest.profile_key.toLowerCase() }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].profile_key).to.equal(dataRequest.profile_key);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });
    });
  });
});
