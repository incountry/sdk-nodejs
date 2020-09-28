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
    expect(recordBefore.attachments).to.be.empty;

    const fileName = 'example license file';
    const attachmentData = { file: './LICENSE', fileName };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.be.not.empty;
    expect(recordAfter.attachments[0].fileName).to.equal(fileName);
  });

  it('add attachment specified from Buffer', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.be.empty;

    const file = await fs.promises.readFile('./LICENSE');
    const fileName = 'example license file';
    const attachmentData = { file, fileName };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.be.not.empty;
    expect(recordAfter.attachments[0].fileName).to.equal(fileName);
  });

  it('add attachment specified from Stream', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.be.empty;

    const file$ = fs.createReadStream('./LICENSE');
    const fileName = 'example license file';
    const attachmentData = { file: file$, fileName };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.be.not.empty;
    expect(recordAfter.attachments[0].fileName).to.equal(fileName);
  });

  xit('upsert attachment specified by file path', async () => {

  });

  xit('upsert attachment specified from Buffer', async () => {

  });

  xit('upsert attachment specified from Stream', async () => {

  });
});
