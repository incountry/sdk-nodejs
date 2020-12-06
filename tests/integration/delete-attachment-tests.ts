import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';


chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let recordData: StorageRecordData;

describe('Delete attachment from record', () => {
  beforeEach(async () => {
    storage = await createStorage({ encryption: true });
    recordData = {
      recordKey: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };
    await storage.write(COUNTRY, recordData).catch(noop);
  });

  afterEach(async () => {
    await storage.delete(COUNTRY, recordData.recordKey).catch(noop);
  });

  it('should delete attachment from record', async () => {
    const { attachmentMeta: data1 } = await storage.addAttachment(COUNTRY, recordData.recordKey, { file: './LICENSE', fileName: '' });
    const { attachmentMeta: data2 } = await storage.addAttachment(COUNTRY, recordData.recordKey, { file: './README.md', fileName: '' });

    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.have.lengthOf(2);
    expect(recordBefore.attachments).to.deep.include(data1);
    expect(recordBefore.attachments).to.deep.include(data2);

    await storage.deleteAttachment(COUNTRY, recordData.recordKey, data1.fileId);

    const { record: recordAfter1 } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter1.attachments).to.have.lengthOf(1);
    expect(recordAfter1.attachments[0].fileName).to.equal(data2.fileName);

    await storage.deleteAttachment(COUNTRY, recordData.recordKey, data2.fileId);

    const { record: recordAfter2 } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter2.attachments).to.be.empty;
  });
});
