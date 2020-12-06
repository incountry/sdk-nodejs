import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { Int } from '../../src/validation/utils';

chai.use(chaiAsPromised);
const { expect, assert } = chai;

let storage: Storage;

const randomString = () => Math.random().toString(36).substr(2, 10);
const randomInt = () => Math.floor(Math.random() * 100) + 1 as Int;

const dataRequest = {
  recordKey: randomString(),
  body: JSON.stringify({ name: 'PersonName' }),
  precommitBody: JSON.stringify({ name: 'aaa' }),
  profileKey: randomString(),
  rangeKey1: randomInt(),
  rangeKey2: randomInt(),
  rangeKey3: 441 as Int,
  rangeKey4: 41 as Int,
  rangeKey5: 1 as Int,
  rangeKey6: 41 as Int,
  rangeKey7: 441 as Int,
  rangeKey8: 4241 as Int,
  rangeKey9: 441 as Int,
  rangeKey10: randomInt(),
  key1: randomString(),
  key2: randomString(),
  key3: randomString(),
  key4: randomString(),
  key5: randomString(),
  key6: randomString(),
  key7: randomString(),
  key8: randomString(),
  key9: randomString(),
  key10: randomString(),
  serviceKey1: randomString(),
  serviceKey2: randomString(),
};

describe('Find one record', () => {
  after(async () => {
    await storage.delete(COUNTRY, dataRequest.recordKey).catch(noop);
  });

  [false, true].forEach(async (encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, () => {
      before(async () => {
        storage = await createStorage({ encryption });
        await storage.write(COUNTRY, dataRequest);
      });

      it('Find one record by recordKey', async () => {
        const { record } = await storage.findOne(COUNTRY, { recordKey: dataRequest.recordKey });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record).to.deep.include(dataRequest);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Find one record by key1', async () => {
        const { record } = await storage.findOne(COUNTRY, { key1: dataRequest.key1 });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record).to.deep.include(dataRequest);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Find one record by key10', async () => {
        const { record } = await storage.findOne(COUNTRY, { key10: dataRequest.key10 });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record).to.deep.include(dataRequest);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Find one record by profileKey', async () => {
        const { record } = await storage.findOne(COUNTRY, { profileKey: dataRequest.profileKey });
        if (record === null) {
          throw assert.fail('Record should not be null');
        }

        expect(record).to.deep.include(dataRequest);
        expect(record.createdAt).to.be.a('date');
        expect(record.updatedAt).to.be.a('date');
      });

      it('Record not found by incorrect recordKey', async () => {
        const { record } = await storage.findOne(COUNTRY, { recordKey: Math.random().toString(36).substr(2, 10) });
        expect(record).to.equal(null);
      });
    });
  });
});
