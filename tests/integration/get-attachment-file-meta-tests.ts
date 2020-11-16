import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let recordData: StorageRecordData;

describe('Get attachment meta by id', () => {
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

  it('should get attachment meta by id', async () => {
    const fileName = '1111';
    const { attachmentMeta } = await storage.addAttachment(COUNTRY, recordData.recordKey, { file: './LICENSE', fileName });

    const { attachmentMeta: result } = await storage.getAttachmentMeta(COUNTRY, recordData.recordKey, attachmentMeta.fileId);

    expect(result.fileName).to.equal(fileName);
    expect(result).to.deep.equal(attachmentMeta);
  });
});
