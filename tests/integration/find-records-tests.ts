import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { StorageServerError } from '../../src/errors';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';

chai.use(chaiAsPromised);
const { expect } = chai;

const ANOTHER_COUNTRY = COUNTRY === 'us' ? 'se' : 'us';

let storage: Storage;

const dataRequest = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName' }),
};

const dataRequest2 = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName2' }),
};

const dataRequest3 = {
  key: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profile_key: Math.random().toString(36).substr(2, 10),
  range_key: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName3' }),
};

describe('Find records', () => {
  after(async () => {
    await storage.delete(COUNTRY, dataRequest.key).catch(noop);
    await storage.delete(COUNTRY, dataRequest2.key).catch(noop);
    await storage.delete(COUNTRY, dataRequest3.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage(encryption);
        await storage.write(COUNTRY, dataRequest);
        await storage.write(COUNTRY, dataRequest2);
        await storage.write(COUNTRY, dataRequest3);
      });

      xit('Find records by country', async () => {
        const { records, meta } = await storage.find(COUNTRY, {}, {});

        expect(records).to.have.lengthOf(2);

        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(2);
        expect(meta.total).to.equal(2);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      xit('Find records by key', async () => {
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

      xit('Find records by key2', async () => {
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

      xit('Find records by key3', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key3: dataRequest.key3 }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key3).to.equal(dataRequest.key3);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      xit('Find records by profile_key', async () => {
        const { records, meta } = await storage.find(COUNTRY, { profile_key: dataRequest.profile_key }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].profile_key).to.equal(dataRequest.profile_key);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      xit('Find record list of keys', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key2: [dataRequest.key2, dataRequest2.key2] }, {});

        expect(records).to.have.lengthOf(2);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(2);
        expect(meta.total).to.equal(2);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      xit('Find records with pagination', async () => {
        const limit = 10;
        const offset = 1;
        const { records, meta } = await storage.find(COUNTRY, { range_key: { $lt: 100 } },
          {
            limit,
            offset,
          });

        expect(records).to.be.lengthOf(1);
        expect(records).to.be.lengthOf.at.most(limit);

        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.be.not.above(limit);
        expect(meta.offset).to.equal(offset);
        expect(meta.limit).to.equal(limit);
      });

      xit('Find records by filter with range_key', async () => {
        const { records, meta } = await storage.find(COUNTRY,
          { range_key: { $lt: 100 } }, {});

        expect(records).to.have.lengthOf(2);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
        expect(meta.count).to.equal(2);
        expect(meta.total).to.equal(2);
      });

      xit('Find records by filter with $not', async () => {
        const { records: allRecords } = await storage.find(COUNTRY, {}, {});
        expect(allRecords).to.have.lengthOf(3);

        const { records } = await storage.find(COUNTRY,
          { key2: dataRequest.key2 }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.include(dataRequest);

        const { meta, records: recordsFound } = await storage.find(COUNTRY,
          { key2: { $not: dataRequest.key2 } }, {});

        expect(meta.count).to.equal(2);
        expect(recordsFound.map((r) => r.key)).to.include.members([dataRequest2.key, dataRequest3.key]);
      });

      xit('Records not found by key value', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key2: Math.random().toString(36).substr(2, 10) }, {});

        expect(records).to.have.lengthOf(0);
        expect(meta.count).to.equal(0);
        expect(meta.total).to.equal(0);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      xit('Records not found by country', async () => {
        await expect(storage.findOne(ANOTHER_COUNTRY, {}))
          .to.be.rejectedWith(StorageServerError, 'Request failed with status code 409');
      });
    });
  });
});
