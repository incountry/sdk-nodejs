import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { StorageServerError } from '../../src/errors';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';

chai.use(chaiAsPromised);
const { expect, assert } = chai;

const ANOTHER_COUNTRY = COUNTRY === 'us' ? 'se' : 'us';

let storage: Storage;

const dataRequest = {
  recordKey: Math.random().toString(36).substr(2, 10),
  key2: Math.random().toString(36).substr(2, 10),
  key3: Math.random().toString(36).substr(2, 10),
  profileKey: Math.random().toString(36).substr(2, 10),
  rangeKey1: Math.floor(Math.random() * 100) + 1 as Int,
  body: JSON.stringify({ name: 'PersonName' }),
};

describe('Find one record', () => {
  after(async () => {
    await storage.delete(COUNTRY, dataRequest.recordKey).catch(noop);
  });

  [false, true].forEach(async (encryption) => {
    storage = await createStorage(encryption);
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage(encryption);
        await storage.write(COUNTRY, dataRequest);
      });
      it.skip('Find one record by country', async () => {
        const { record } = await storage.findOne(COUNTRY, {});
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record.recordKey).to.equal(dataRequest.recordKey);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profileKey).to.equal(dataRequest.profileKey);
        expect(record.rangeKey1).to.equal(dataRequest.rangeKey1);
        expect(record.body).to.equal(dataRequest.body);
      });

      it.skip('Find one record by key', async () => {
        const { record } = await storage.findOne(COUNTRY, { key: dataRequest.recordKey });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record.recordKey).to.equal(dataRequest.recordKey);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profileKey).to.equal(dataRequest.profileKey);
        expect(record.rangeKey1).to.equal(dataRequest.rangeKey1);
        expect(record.body).to.equal(dataRequest.body);
      });

      it.skip('Find one record by key2', async () => {
        const { record } = await storage.findOne(COUNTRY, { key2: dataRequest.key2 });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record.recordKey).to.equal(dataRequest.recordKey);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profileKey).to.equal(dataRequest.profileKey);
        expect(record.rangeKey1).to.equal(dataRequest.rangeKey1);
        expect(record.body).to.equal(dataRequest.body);
      });

      it.skip('Find one record by key3', async () => {
        const { record } = await storage.findOne(COUNTRY, { key3: dataRequest.key3 });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record.recordKey).to.equal(dataRequest.recordKey);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profileKey).to.equal(dataRequest.profileKey);
        expect(record.rangeKey1).to.equal(dataRequest.rangeKey1);
        expect(record.body).to.equal(dataRequest.body);
      });

      it.skip('Find one record by profileKey', async () => {
        const { record } = await storage.findOne(COUNTRY, { profileKey: dataRequest.profileKey });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record.recordKey).to.equal(dataRequest.recordKey);
        expect(record.key2).to.equal(dataRequest.key2);
        expect(record.key3).to.equal(dataRequest.key3);
        expect(record.profileKey).to.equal(dataRequest.profileKey);
        expect(record.rangeKey1).to.equal(dataRequest.rangeKey1);
        expect(record.body).to.equal(dataRequest.body);
      });

      it.skip('Record not found by key value', async () => {
        const { record } = await storage.findOne(COUNTRY, { key: Math.random().toString(36).substr(2, 10) });
        expect(record).to.equal(null);
      });

      it.skip('Record not found by country', async () => {
        await expect(storage.findOne(ANOTHER_COUNTRY, {})).to.be.rejectedWith(StorageServerError, 'Request failed with status code 409');
      });
    });
  });
});
