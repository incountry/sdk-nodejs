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
    await storage.delete(COUNTRY, data.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage(encryption);
      });

      it('Read data', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
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
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          profile_key: 'profileKey',
          range_key: 42341 as Int,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.body).to.equal(data.body);
        expect(record.key).to.equal(data.key);
        expect(record.key2).to.equal(data.key2);
        expect(record.key3).to.equal(data.key3);
        expect(record.profile_key).to.equal(data.profile_key);
        expect(record.range_key).to.equal(data.range_key);
      });

      it('Read data with null body', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Read data with empty body', async () => {
        data = {
          key: Math.random().toString(36).substr(2, 10),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(null);
      });
    });
  });
});
