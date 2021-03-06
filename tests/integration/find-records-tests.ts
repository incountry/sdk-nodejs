import 'mocha';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { v4 as uuid } from 'uuid';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';
import { FindResponseMeta } from '../../src/validation/api/find-response';
import { StorageRecordData } from '../../src/validation/user-input/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;

const createRecordData = (data?: {}) => ({
  recordKey: uuid(),
  key1: uuid(),
  key2: uuid(),
  key3: uuid(),
  key10: uuid(),
  key15: uuid(),
  profileKey: uuid(),
  parentKey: uuid(),
  rangeKey1: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName' }),
  serviceKey2: 'NodeJS SDK integration test data for find() method',
  serviceKey5: 'More integration test data',
  ...data,
});

const checkFindResponseMeta = (meta: FindResponseMeta, total: number, count = total, offset = 0, limit = 100) => {
  expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
  expect(meta.count).to.equal(count);
  expect(meta.total).to.equal(total);
  expect(meta.offset).to.equal(offset);
  expect(meta.limit).to.equal(limit);
};

const expiresAt = new Date();
expiresAt.setMilliseconds(0);
expiresAt.setDate(expiresAt.getDate() + 2);

const expiresAt2 = new Date();
expiresAt2.setMilliseconds(0);
expiresAt2.setDate(expiresAt2.getDate() + 3);

const dataRequest = createRecordData({
  key12: 'a', rangeKey6: 3,
});
const dataRequest2 = createRecordData({
  key11: 'a', key12: 'b', rangeKey3: 1, rangeKey6: 2, expiresAt: expiresAt2,
});
const dataRequest3 = createRecordData({
  key11: 'b', key12: 'c', rangeKey3: 2, rangeKey6: 1, expiresAt,
});

const toRecordKey = (record: { recordKey: string }) => record.recordKey;

describe('Find records', () => {
  after(async () => {
    await storage.delete(COUNTRY, dataRequest.recordKey).catch(noop);
    await storage.delete(COUNTRY, dataRequest2.recordKey).catch(noop);
    await storage.delete(COUNTRY, dataRequest3.recordKey).catch(noop);
  });

  [
    false,
    true,
  ].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage({ encryption, hashSearchKeys: false });
        await storage.write(COUNTRY, dataRequest);
        await storage.write(COUNTRY, dataRequest2);
        await storage.write(COUNTRY, dataRequest3);
      });

      it('Find records by country', async () => {
        const { records, meta } = await storage.find(COUNTRY, { recordKey: [dataRequest.recordKey, dataRequest2.recordKey, dataRequest3.recordKey] }, {});

        expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
        expect(meta.count).to.be.gte(3);
        expect(meta.total).to.be.gte(3);
        expect(meta.offset).to.equal(0);
        expect(meta.limit).to.equal(100);

        expect(records.length).to.be.gte(3);
        const receivedKeys = records.map(toRecordKey);
        expect(receivedKeys).to.include.members([dataRequest.recordKey, dataRequest2.recordKey, dataRequest3.recordKey]);
      });

      it('Find records by key', async () => {
        const { records, meta } = await storage.find(COUNTRY, { recordKey: dataRequest.recordKey }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by key2', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key2: dataRequest.key2, key3: { $not: null } }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by key3', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key3: dataRequest.key3, key4: null }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by key15', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key15: dataRequest.key15, parentKey: { $not: null } }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by profileKey', async () => {
        const { records, meta } = await storage.find(COUNTRY, { profileKey: dataRequest.profileKey }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by parentKey', async () => {
        const { records, meta } = await storage.find(COUNTRY, { parentKey: dataRequest.parentKey }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by expiresAt', async () => {
        const { records, meta } = await storage.find(COUNTRY, { expiresAt }, {});

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.deep.include(dataRequest3);
        checkFindResponseMeta(meta, 1);
      });

      it('Find records by filter with expiresAt set to null', async () => {
        const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
        const { records: foundRecords } = await storage.find(COUNTRY, { recordKey: recordKeyList, expiresAt: null }, {});
        const foundRecordKeys = foundRecords.map(toRecordKey);

        expect(foundRecordKeys).to.include(dataRequest.recordKey);
        expect(foundRecordKeys).to.not.include(dataRequest2.recordKey);
        expect(foundRecordKeys).to.not.include(dataRequest3.recordKey);
      });

      it('Find records by filter with expiresAt set to not null', async () => {
        const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
        const { records: foundRecords } = await storage.find(COUNTRY, { recordKey: recordKeyList, expiresAt: { $not: null } }, {});
        const foundRecordKeys = foundRecords.map(toRecordKey);

        expect(foundRecordKeys).to.not.include(dataRequest.recordKey);
        expect(foundRecordKeys).to.include(dataRequest2.recordKey);
        expect(foundRecordKeys).to.include(dataRequest3.recordKey);
      });

      it('Find record list of keys', async () => {
        const recordsList = [dataRequest, dataRequest2];
        const key2List = recordsList.map((r) => r.key2);
        const recordKeyList = recordsList.map(toRecordKey);
        const { records, meta } = await storage.find(COUNTRY, { key2: key2List }, {});

        expect(records).to.have.lengthOf(2);
        records.forEach((r) => {
          const index = recordKeyList.indexOf(r.recordKey);
          expect(index).to.be.gte(0);
          expect(r).to.deep.include(recordsList[index]);
        });
        checkFindResponseMeta(meta, 2);
      });

      describe('Find options', () => {
        it('Find records with pagination', async () => {
          const limit = 2;
          const offset = 2;
          const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
          const { records, meta } = await storage.find(COUNTRY, { recordKey: recordKeyList, rangeKey1: { $lte: 100 } },
            {
              limit,
              offset,
            });

          expect(records).to.have.lengthOf(1);
          checkFindResponseMeta(meta, 3, 1, offset, limit);
        });

        describe('Sorting', () => {
          it('Find records with sorting by key', async () => {
            const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
            const { records } = await storage.find(COUNTRY, { recordKey: recordKeyList }, { sort: [{ key12: 'desc' }] });

            expect(records.map((record) => record.recordKey)).to.deep.equal([dataRequest3, dataRequest2, dataRequest].map(toRecordKey));
          });

          it('Find records with sorting by rangeKey', async () => {
            const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
            const { records } = await storage.find(COUNTRY, { recordKey: recordKeyList }, { sort: [{ rangeKey6: 'asc' }] });

            expect(records.map((record) => record.recordKey)).to.deep.equal([dataRequest3, dataRequest2, dataRequest].map(toRecordKey));
          });

          it('Find records with sorting by createdAt', async () => {
            const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
            const { records } = await storage.find(COUNTRY, { recordKey: recordKeyList }, { sort: [{ createdAt: 'desc' }] });

            expect(records.map((record) => record.recordKey)).to.deep.equal([dataRequest3, dataRequest2, dataRequest].map(toRecordKey));
          });

          it('Find records with sorting by expiresAt (null threated as maximum)', async () => {
            const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
            const { records } = await storage.find(COUNTRY, { recordKey: recordKeyList }, { sort: [{ expiresAt: 'asc' }] });

            const foundRecordKeys = records.map((record) => record.recordKey);
            expect(foundRecordKeys).to.deep.equal([dataRequest3, dataRequest2, dataRequest].map(toRecordKey));
          });
        });
      });

      it('Find records by filter with rangeKey1', async () => {
        const recordKeyList = [dataRequest, dataRequest2, dataRequest3].map(toRecordKey);
        const { records } = await storage.find(COUNTRY, { recordKey: recordKeyList, rangeKey1: { $lte: 100 } }, {});

        expect(records.length).to.be.gte(3);
        const receivedKeys = records.map(toRecordKey);
        expect(receivedKeys).to.include.members([dataRequest.recordKey, dataRequest2.recordKey, dataRequest3.recordKey]);
      });

      it('Find records by filter with $not', async () => {
        const { records: foundRecords } = await storage.find(COUNTRY, { key2: { $not: dataRequest.key2 } }, {});
        const foundRecordKeys = foundRecords.map(toRecordKey);

        expect(foundRecordKeys).to.not.include(dataRequest.recordKey);
      });

      it('Records not found by random key2 value', async () => {
        const { records, meta } = await storage.find(COUNTRY, { key2: Math.random().toString(36).substr(2, 10) }, {});

        expect(records).to.have.lengthOf(0);
        checkFindResponseMeta(meta, 0);
      });

      context('Records search by searchKeys', () => {
        let searchableStorage: Storage;
        const record = createRecordData();
        const searchableProperties: (keyof StorageRecordData)[] = ['key1', 'key10', 'key15'];

        before(async () => {
          searchableStorage = await createStorage({
            encryption,
            hashSearchKeys: false,
          });
          await searchableStorage.write(COUNTRY, record);
        });

        after(async () => {
          await searchableStorage.delete(COUNTRY, record.recordKey).catch(noop);
        });

        searchableProperties.forEach((property) => {
          const value = (record as StorageRecordData)[property] as string;
          const searchCriterias = [
            { description: 'full match', criteria: value },
            { description: 'partial match (prefix)', criteria: value.substring(0, value.length - 1) },
            { description: 'partial match (suffix)', criteria: value.substring(1, value.length) },
            { description: 'partial match (in the middle)', criteria: value.substring(1, value.length - 1) },
          ];

          searchCriterias.forEach(({ description, criteria }) => {
            it(`should find record by ${property} ${description}`, async () => {
              const { records, meta } = await searchableStorage.find(COUNTRY, { searchKeys: criteria }, {});

              expect(records).to.have.lengthOf(1);
              expect(records[0]).to.deep.include(record);
              checkFindResponseMeta(meta, 1);
            });
          });
        });
      });
    });
  });
});
