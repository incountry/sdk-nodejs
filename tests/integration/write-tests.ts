import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';
import { StorageRecordData } from '../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: StorageRecordData;

describe('Write data to Storage', () => {
  afterEach(async () => {
    await storage.delete(COUNTRY, data.recordKey).catch(noop);
  });

  [false, true].forEach(async (encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      beforeEach(async () => {
        storage = await createStorage({ encryption });
      });

      it('Write data', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(data.body);
      });

      it('Write data with optional keys and range value', async () => {
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
          serviceKey1: 'optional service key value 1',
          serviceKey2: 'optional service key value 2',
        };

        await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record).to.deep.include(data);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Write data with null body', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(data.body);
      });

      it('Rewrite data', async () => {
        data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ firstName: 'MyFirstName' }),
        };

        await storage.write(COUNTRY, data);
        const result1 = await storage.read(COUNTRY, data.recordKey);

        expect(result1.record.recordKey).to.equal(data.recordKey);
        expect(result1.record.body).to.equal(data.body);

        data.body = JSON.stringify({ lastName: 'MyLastName' });

        await storage.write(COUNTRY, data);
        const result2 = await storage.read(COUNTRY, data.recordKey);

        expect(result2.record.recordKey).to.equal(data.recordKey);
        expect(result2.record.body).to.equal(data.body);
      });

      describe('Write search keys', () => {
        context('with "hashSearchKeys" enabled', () => {
          it('should write search keys hashed', async () => {
            data = {
              recordKey: Math.random().toString(36).substr(2, 10),
              key1: '123456',
              key9: '123eszdsd',
            };

            await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
            await storage.write(COUNTRY, data);

            const record = await storage.apiClient.read(COUNTRY, storage.createKeyHash(data.recordKey));

            expect(record.record_key).to.equal(storage.createKeyHash(data.recordKey), 'record key');
            expect(record.key1).to.equal(storage.createKeyHash(data.key1 as string), 'key1');
            expect(record.key9).to.equal(storage.createKeyHash(data.key9 as string), 'key9');
          });
        });

        context('with "hashSearchKeys" disabled', () => {
          it('should write search keys as is', async () => {
            storage = await createStorage({
              encryption,
              hashSearchKeys: false,
            });

            data = {
              recordKey: Math.random().toString(36).substr(2, 10),
              key1: '123456',
              key9: '123eszdsd',
            };

            await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
            await storage.write(COUNTRY, data);

            const record = await storage.apiClient.read(COUNTRY, storage.createKeyHash(data.recordKey));

            expect(record.record_key).to.equal(storage.createKeyHash(data.recordKey), 'record key');
            expect(record.key1).to.equal(data.key1, 'key1');
            expect(record.key9).to.equal(data.key9, 'key9');
          });
        });
      });
    });
  });
});
