import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record';
import { Int } from '../../src/validation/utils';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: StorageRecordData;

describe('Write data to Storage', () => {
  afterEach(async () => {
    await storage.delete(COUNTRY, data.key).catch(noop);
  });

  [false, true].forEach(async (encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage(encryption);
      });

      it('Write data', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Write data with optional keys and range value', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          profile_key: 'profileKey',
          range_key1: 42341 as Int,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Write data with null body', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Rewrite data', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ firstName: 'MyFirstName' }),
        };

        await storage.write(COUNTRY, data);
        const result1 = await storage.read(COUNTRY, data.key);

        expect(result1.record.key).to.equal(data.key);
        expect(result1.record.body).to.equal(data.body);

        data.body = JSON.stringify({ lastName: 'MyLastName' });

        await storage.write(COUNTRY, data);
        const result2 = await storage.read(COUNTRY, data.key);

        expect(result2.record.key).to.equal(data.key);
        expect(result2.record.body).to.equal(data.body);
      });
    });
  });
});
