import * as chai from 'chai';
import * as fs from 'fs';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';
import { readStream } from '../test-helpers/utils';


chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let recordData: StorageRecordData;

describe('Get attachment file for record', () => {
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

  it('should get attachment file data', async () => {
    const file = await fs.promises.readFile('./LICENSE');
    const fileName = Math.random().toString(36).substr(2, 10).toUpperCase();
    const data = await storage.addAttachment(COUNTRY, recordData.recordKey, { file, fileName });

    const { file: file$ } = await storage.getAttachmentFile(COUNTRY, recordData.recordKey, data.fileId);
    const receivedFile = await readStream(file$);

    // expect(receivedFileName).to.equal(fileName);
    expect(receivedFile).to.deep.equal(file);
  });
});
