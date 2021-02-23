import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import {
  createStorage, COUNTRY, DEFAULT_SECRET, noop,
} from './common';
import { Storage } from '../../src';
import { StorageAuthenticationError, StorageServerError } from '../../src/errors';
import { Int } from '../../src/validation/utils';
import { StorageRecordData } from '../../src/validation/storage-record-data';
import { readStream } from '../test-helpers/utils';

chai.use(chaiAsPromised);
const { assert, expect } = chai;

let storage: Storage;
let data: StorageRecordData;
let dataList: StorageRecordData[];

const createRecord = (profileKey = 'profileKey') => ({
  recordKey: uuid(),
  body: JSON.stringify({ name: 'PersonName' }),
  profileKey,
  rangeKey10: 41 as Int,
  key10: 'optional key value 10',
  serviceKey2: 'optional service key value 2',
  serviceKey5: 'More integration test data',
});

describe('With OAuth authentication', () => {
  beforeEach(async () => {
    storage = await createStorage({
      encryption: true,
      useOAuth: true,
    });
    dataList = [];
  });

  afterEach(async () => {
    if (data) {
      await storage.delete(COUNTRY, data.recordKey).catch(noop);
      data = undefined as any;
    }
    if (dataList && dataList.length) {
      await Promise.all(dataList.map(async (item) => {
        await storage.delete(COUNTRY, item.recordKey).catch(noop);
      }));
      dataList = [];
    }
  });

  it('writes and reads data', async () => {
    data = createRecord();

    await storage.write(COUNTRY, data);
    const { record } = await storage.read(COUNTRY, data.recordKey);

    expect(record).to.deep.include(data);
    expect(record.createdAt).to.be.a('date');
    expect(record.updatedAt).to.be.a('date');
  });

  it('writes data in batches', async () => {
    dataList = [{
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName1' }),
    }, {
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName2' }),
    }, {
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName3' }),
    }];

    const { records } = await storage.batchWrite(COUNTRY, dataList);
    expect(records).to.eql(dataList);

    await Promise.all(dataList.map(async (item) => {
      const { record } = await storage.read(COUNTRY, item.recordKey);
      expect(record.recordKey).to.equal(item.recordKey);
      expect(record.body).to.equal(item.body);
    }));
  });

  it('deletes data', async () => {
    data = createRecord();

    await storage.write(COUNTRY, data);

    const deleteResult = await storage.delete(COUNTRY, data.recordKey);
    expect(deleteResult.success).to.equal(true);

    const error = await expect(storage.read(COUNTRY, data.recordKey))
      .to.be.rejectedWith(StorageServerError);

    expect(error.code).to.be.equal(404);
    data = undefined as any;
  });

  it('finds one record', async () => {
    data = createRecord();

    await storage.write(COUNTRY, data);

    const { record } = await storage.findOne(COUNTRY, { recordKey: data.recordKey });
    if (record === null) {
      throw assert.fail('Record should not be null');
    }

    expect(record).to.deep.include(data);
    expect(record.createdAt).to.be.a('date');
    expect(record.updatedAt).to.be.a('date');
  });

  it('finds several records', async () => {
    const profileKey = uuid();
    dataList = [createRecord(profileKey), createRecord(profileKey), createRecord(profileKey)];

    await storage.batchWrite(COUNTRY, dataList);

    const { records, meta } = await storage.find(COUNTRY, { profileKey }, {});
    expect(records).to.have.lengthOf(3);
    records.forEach((record) => {
      expect(record.profileKey).to.equal(profileKey);
      const sourceRecord = dataList.filter((item) => item.recordKey === record.recordKey);
      expect(sourceRecord).to.not.be.empty;
    });
    expect(meta).to.have.all.keys('count', 'limit', 'offset', 'total');
    expect(meta.count).to.equal(3);
    expect(meta.total).to.equal(3);
    expect(meta.offset).to.equal(0);
    expect(meta.limit).to.equal(100);
  });

  it('migrates data', async () => {
    dataList = [{
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName1' }),
    }, {
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName2' }),
    }, {
      recordKey: uuid(),
      body: JSON.stringify({ name: 'PersonName3' }),
    }];

    const keys = dataList.map((r) => r.recordKey);

    await storage.batchWrite(COUNTRY, dataList);

    const secret2 = async () => ({
      secrets: [
        { secret: DEFAULT_SECRET(), version: 0 },
        { secret: 'supersecret234', version: 1 },
      ],
      currentVersion: 1,
    });

    const storage2 = await createStorage({
      encryption: true,
      useOAuth: true,
      getSecrets: secret2,
    });
    const migrateRes = await storage2.migrate(COUNTRY, undefined, { recordKey: keys });
    expect(migrateRes.meta.migrated).to.eq(dataList.length);

    const updatedRecords = await storage2.find(COUNTRY, { recordKey: keys, version: 1 });
    expect(updatedRecords.records.length).to.equal(dataList.length);
    updatedRecords.records.forEach((record) => {
      const sourceRecord = dataList.filter((item) => item.recordKey === record.recordKey);
      expect(sourceRecord).to.not.be.empty;
    });
  });

  context('attachments', () => {
    const fileName = 'example license file';
    const attachmentData = { file: './LICENSE', fileName };

    beforeEach(async () => {
      data = createRecord();
      await storage.write(COUNTRY, data);
    });

    it('creates attachment', async () => {
      await storage.addAttachment(COUNTRY, data.recordKey, attachmentData);

      const { record } = await storage.read(COUNTRY, data.recordKey);
      expect(record.attachments).to.be.not.empty;
      expect(record.attachments[0].fileName).to.equal(fileName);
    });

    it('updates attachment file name', async () => {
      const { attachmentMeta } = await storage.addAttachment(COUNTRY, data.recordKey, attachmentData);

      const fileName2 = uuid();
      await storage.updateAttachmentMeta(COUNTRY, data.recordKey, attachmentMeta.fileId, { fileName: fileName2 });

      const { record } = await storage.read(COUNTRY, data.recordKey);
      expect(record.attachments).to.have.lengthOf(1);
      expect(record.attachments[0]).to.deep.include({ fileName: fileName2 });
    });

    it('returns attachment meta by id', async () => {
      const { attachmentMeta } = await storage.addAttachment(COUNTRY, data.recordKey, attachmentData);

      const { attachmentMeta: result } = await storage.getAttachmentMeta(COUNTRY, data.recordKey, attachmentMeta.fileId);

      expect(result.fileName).to.equal(fileName);
      expect(result).to.deep.equal(attachmentMeta);
    });

    it('downloads attachment', async () => {
      const file = await fs.promises.readFile('./LICENSE');
      const { attachmentMeta } = await storage.addAttachment(COUNTRY, data.recordKey, { file, fileName });

      const { attachmentData: { file: fileDownloadStream, fileName: downloadedFileName } } = await storage.getAttachmentFile(COUNTRY, data.recordKey, attachmentMeta.fileId);
      const receivedFile = await readStream(fileDownloadStream);

      expect(downloadedFileName).to.match(/file/);
      expect(receivedFile).to.deep.equal(file);
    });

    it('deletes attachment', async () => {
      const { attachmentMeta } = await storage.addAttachment(COUNTRY, data.recordKey, attachmentData);

      const { record: recordBefore } = await storage.read(COUNTRY, data.recordKey);
      expect(recordBefore.attachments).to.be.not.empty;
      expect(recordBefore.attachments).to.have.length(1);
      expect(recordBefore.attachments[0].fileName).to.equal(fileName);

      await storage.deleteAttachment(COUNTRY, data.recordKey, attachmentMeta.fileId);

      const { record: recordAfter } = await storage.read(COUNTRY, data.recordKey);
      expect(recordAfter.attachments).to.be.empty;
    });
  });

  context('with wrong credentials', () => {
    let envIdOauth: any;
    let storage2: Storage;
    beforeEach(async () => {
      envIdOauth = process.env.INT_INC_ENVIRONMENT_ID_OAUTH;
      process.env.INT_INC_ENVIRONMENT_ID_OAUTH = uuid();
      storage2 = await createStorage({
        encryption: true,
        useOAuth: true,
      });
    });

    afterEach(() => {
      process.env.INT_INC_ENVIRONMENT_ID_OAUTH = envIdOauth;
    });

    it('should throw error on any storage operation', async () => {
      data = createRecord();

      const error = await expect(storage2.write(COUNTRY, data))
        .to.be.rejectedWith(
          StorageAuthenticationError,
          'Error during Storage.write() call: The requested scope is invalid, unknown, or malformed.',
        );
      expect(error.data).to.deep.include({
        error: 'invalid_scope',
        error_description: 'The requested scope is invalid, unknown, or malformed',
        status_code: 400,
      });
      data = undefined as any;
    });
  });
});
