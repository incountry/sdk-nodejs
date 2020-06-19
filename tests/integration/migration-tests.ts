import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let records: StorageRecordData[];

function generateKey() { return Math.random().toString(36).substr(2, 10); }

describe('Migrate data with different secret version to current', () => {
  afterEach(async () => {
    await Promise.all(records.map((r) => storage.delete(COUNTRY, r.key))).catch(noop);
  });

  it('Migrates data', async () => {
    const secret1 = async () => ({
      secrets: [
        { secret: 'supersecret123', version: 1 },
      ],
      currentVersion: 1,
    });

    storage = await createStorage(true, false, secret1);

    records = [{
      key: generateKey(),
      body: JSON.stringify({ name: 'PersonName0' }),
    }, {
      key: generateKey(),
      body: JSON.stringify({ name: 'PersonName1' }),
    }, {
      key: generateKey(),
      body: JSON.stringify({ name: 'PersonName2' }),
    }];

    const keys = records.map((r) => r.key);

    await storage.batchWrite(COUNTRY, records);

    const secret2 = async () => ({
      secrets: [
        { secret: 'supersecret123', version: 1 },
        { secret: 'supersecret234', version: 2 },
      ],
      currentVersion: 2,
    });

    const storage2 = await createStorage(true, false, secret2);

    await storage2.migrate(COUNTRY, 3, { key: keys });

    const b = await storage2.find(COUNTRY, { key: keys, version: 2 });
    expect(b.records.length).to.equal(records.length);
  });
});
