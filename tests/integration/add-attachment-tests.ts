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

  it('add attachment specified by file path with custom mime-type', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.be.empty;

    const fileName = 'example license file';
    const mimeType = 'text/whoa';
    const attachmentData = { file: './LICENSE', fileName, mimeType };
    await storage.addAttachment(COUNTRY, recordData.recordKey, attachmentData);

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.be.not.empty;
    expect(recordAfter.attachments[0].fileName).to.equal(fileName);
    expect(recordAfter.attachments[0].mimeType).to.equal(mimeType);
  });

  it('upsert attachment specified by file path', async () => {
    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.be.empty;

    const file1 = await fs.promises.readFile('./LICENSE');
    const fileName = 'example license file';
    await storage.addAttachment(COUNTRY, recordData.recordKey, { file: file1, fileName }, true);

    const { record: recordAfter1 } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter1.attachments).to.be.not.empty;
    expect(recordAfter1.attachments[0].fileName).to.equal(fileName);
    expect(recordAfter1.attachments[0].size).to.equal(file1.length);

    const file2 = await fs.promises.readFile('./README.md');
    await storage.addAttachment(COUNTRY, recordData.recordKey, { file: file2, fileName }, true);

    const { record: recordAfter2 } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter2.attachments).to.be.not.empty;
    expect(recordAfter2.attachments[0].fileName).to.equal(fileName);
    expect(recordAfter2.attachments[0].size).to.equal(file2.length);
  });
});
