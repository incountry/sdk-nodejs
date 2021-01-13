import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage, StorageServerError } from '../../src';
import { Int } from '../../src/validation/utils';
import { StorageRecordData } from '../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: StorageRecordData;

describe('Read data from Storage', () => {
  afterEach(async () => {
    await storage.delete(COUNTRY, data.recordKey).catch(noop);
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage({ encryption });
      });

      it('Read data', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(data.body);
      });

      it('Read not existing data', async () => {
        const key = Math.random().toString(36).substr(2, 10);

        const error = await expect(storage.read(COUNTRY, key))
          .to.be.rejectedWith(StorageServerError);

        expect(error.code).to.be.equal(404);
      });

      it('Read data with optional keys and range', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          precommitBody: JSON.stringify({ name: 'aaa' }),
          profileKey: 'profileKey',
          rangeKey1: 42341 as Int,
          rangeKey2: 4241 as Int,
          rangeKey3: 441 as Int,
          rangeKey4: 41 as Int,
          rangeKey5: 1 as Int,
          rangeKey6: 41 as Int,
          rangeKey7: 441 as Int,
          rangeKey8: 4241 as Int,
          rangeKey9: 441 as Int,
          rangeKey10: 41 as Int,
          key1: 'optional key value 1',
          key2: 'optional key value 2',
          key3: 'optional key value 3',
          key4: 'optional key value 4',
          key5: 'optional key value 5',
          key6: 'optional key value 6',
          key7: 'optional key value 7',
          key8: 'optional key value 8',
          key9: 'optional key value 9',
          key10: 'optional key value 10',
          key11: 'optional key value 11',
          key12: 'optional key value 12',
          key13: 'optional key value 13',
          key14: 'optional key value 14',
          key15: 'optional key value 15',
          key16: 'optional key value 16',
          key17: 'optional key value 17',
          key18: 'optional key value 18',
          key19: 'optional key value 19',
          key20: 'optional key value 20',
          serviceKey1: 'optional service key value 1',
          serviceKey2: 'optional service key value 2',
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record).to.deep.include(data);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Read data with null body', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(data.body);
      });

      it('Read data with empty body', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(null);
      });
    });
  });
});
