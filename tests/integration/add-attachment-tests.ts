import * as chai from 'chai';
import * as fs from 'fs';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';


chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let recordData: StorageRecordData;

describe('Add attachment to record', () => {
  beforeEach(async () => {
    storage = await createStorage(true);
    recordData = {
      recordKey: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };
    await storage.write(COUNTRY, recordData).catch(noop);
  });

  afterEach(async () => {
    await storage.delete(COUNTRY, recordData.recordKey).catch(noop);
  });

  it('add attachment specified by file path', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 0 attachment
    expect(recordBefore.rangeKey8).to.equal(null);

    const attachmentData = { file: './LICENSE', fileName: 'example license file' };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 1 attachment
    expect(recordAfter.rangeKey8).to.equal(null);
  });

  it('add attachment specified from Buffer', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 0 attachment
    expect(recordBefore.rangeKey8).to.equal(null);

    const file = await fs.promises.readFile('./LICENSE');
    const attachmentData = { file, fileName: 'example license file' };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 1 attachment
    expect(recordAfter.rangeKey8).to.equal(null);
  });

  it('add attachment specified from Stream', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 0 attachment
    expect(recordBefore.rangeKey8).to.equal(null);

    const file$ = fs.createReadStream('./LICENSE');
    const attachmentData = { file: file$, fileName: 'example license file' };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    // check record has 1 attachment
    expect(recordAfter.rangeKey8).to.equal(null);
  });
});
