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
      before(async () => {
        storage = await createStorage(encryption);
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
          profileKey: 'profileKey',
          rangeKey1: 42341 as Int,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await expect(storage.read(COUNTRY, data.recordKey)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.body).to.equal(data.body);
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
    });
  });
});
