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
        storage = await createStorage(encryption);
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
          profileKey: 'profileKey',
          rangeKey1: 42341 as Int,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.recordKey);

        expect(record.body).to.equal(data.body);
        expect(record.recordKey).to.equal(data.recordKey);
        expect(record.key2).to.equal(data.key2);
        expect(record.key3).to.equal(data.key3);
        expect(record.profileKey).to.equal(data.profileKey);
        expect(record.rangeKey1).to.equal(data.rangeKey1);
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
