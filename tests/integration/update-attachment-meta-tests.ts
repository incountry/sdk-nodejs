import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/user-input/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let recordData: StorageRecordData;

describe('Update attachment meta for record', () => {
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

  it('should update attachment file name', async () => {
    const fileName1 = '1111';
    await storage.addAttachment(COUNTRY, recordData.recordKey, { file: './LICENSE', fileName: fileName1 });

    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.have.lengthOf(1);
    expect(recordBefore.attachments[0]).to.deep.include({ fileName: fileName1 });

    const fileName2 = '1234567';
    await storage.updateAttachmentMeta(COUNTRY, recordData.recordKey, recordBefore.attachments[0].fileId, { fileName: fileName2 });

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.have.lengthOf(1);
    expect(recordAfter.attachments[0]).to.deep.include({ fileName: fileName2 });
  });

  it('should update attachment mime type', async () => {
    const { attachmentMeta } = await storage.addAttachment(COUNTRY, recordData.recordKey, { file: './LICENSE', fileName: '' });

    const { record: recordBefore } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordBefore.attachments).to.have.lengthOf(1);
    expect(recordBefore.attachments[0]).to.deep.include({ mimeType: attachmentMeta.mimeType });

    const newMimeType = '123';
    await storage.updateAttachmentMeta(COUNTRY, recordData.recordKey, recordBefore.attachments[0].fileId, { mimeType: newMimeType });

    const { record: recordAfter } = await storage.read(COUNTRY, recordData.recordKey);
    expect(recordAfter.attachments).to.have.lengthOf(1);
    expect(recordAfter.attachments[0]).to.deep.include({ mimeType: newMimeType });
  });
});
