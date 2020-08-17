import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';

chai.use(chaiAsPromised);
const { expect } = chai;


let storage: Storage;

const dataRequest = {
  recordKey: Math.random().toString(36).substr(2, 10).toUpperCase(),
  key2: Math.random().toString(36).substr(2, 10).toUpperCase(),
  key3: Math.random().toString(36).substr(2, 10).toUpperCase(),
  profileKey: Math.random().toString(36).substr(2, 10).toUpperCase(),
  rangeKey1: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName' }),
};

describe('Normalize keys records', () => {
  after(async () => {
    await storage.delete(COUNTRY, dataRequest.recordKey).catch(noop);
  });

  [false, true].forEach(async (encryption) => {
    storage = await createStorage(encryption, true);

    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage(encryption, true);
        await storage.write(COUNTRY, dataRequest);
      });
      it('Find records by key with lower case', async () => {
        const { records, meta } = await storage.find(COUNTRY, { recordKey: dataRequest.recordKey.toLowerCase() }, {});
        const records2 = await storage.find(COUNTRY, { recordKey: dataRequest.recordKey }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].recordKey).to.equal(dataRequest.recordKey);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);

        expect(records2.records).to.have.lengthOf(1);
        expect(records2.records[0].recordKey).to.equal(dataRequest.recordKey);
        expect(records2.records[0].body).to.equal(dataRequest.body);
        expect(records2.meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(records2.meta.count).to.equal(1);
        expect(records2.meta.total).to.equal(1);
        expect(records2.meta.offset).to.equal(0);
        expect(records2.meta.limit).to.equal(100);
      });

      it('Find records by key2', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key2: dataRequest.key2.toLowerCase() }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].recordKey).to.equal(dataRequest.recordKey);
        expect(records[0].key2).to.equal(dataRequest.key2);
        expect(records[0].body).to.equal(dataRequest.body);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records by key3', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key3: dataRequest.key3.toLowerCase() }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].key3).to.equal(dataRequest.key3);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });

      it('Find records by profileKey', async () => {
        const { records, meta } = await storage.find(COUNTRY, { profileKey: dataRequest.profileKey.toLowerCase() }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0].profileKey).to.equal(dataRequest.profileKey);
        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.equal(1);
        expect(meta.total).to.equal(1);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);
      });
    });
  });
});
