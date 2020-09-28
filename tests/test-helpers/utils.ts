import { StorageRecord, StorageRecordAttachment } from '../../src/validation/storage-record';
import { ApiRecord } from '../../src/validation/api/api-record';
import { ApiRecordAttachment } from '../../src/validation/api/api-record-attachment';

function fromStorageRecordAttachment(a: StorageRecordAttachment): ApiRecordAttachment {
  return {
    file_id: a.fileId,
    filename: a.fileName,
    hash: a.hash,
    mime_type: a.mimeType,
    size: a.size,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    download_link: a.downloadLink,
  };
}

function apiRecordFromStorageRecord(r: StorageRecord, isEncrypted = false): ApiRecord {
  return {
    record_key: r.recordKey,
    body: typeof r.body === 'string' ? r.body : '',
    precommit_body: r.precommitBody,
    version: r.version,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    is_encrypted: isEncrypted,
    profile_key: r.profileKey,
    range_key1: r.rangeKey1,
    range_key2: r.rangeKey2,
    range_key3: r.rangeKey3,
    range_key4: r.rangeKey4,
    range_key5: r.rangeKey5,
    range_key6: r.rangeKey6,
    range_key7: r.rangeKey7,
    range_key8: r.rangeKey8,
    range_key9: r.rangeKey9,
    range_key10: r.rangeKey10,
    service_key1: r.serviceKey1,
    service_key2: r.serviceKey2,
    key1: r.key1,
    key2: r.key2,
    key3: r.key3,
    key4: r.key4,
    key5: r.key5,
    key6: r.key6,
    key7: r.key7,
    key8: r.key8,
    key9: r.key9,
    key10: r.key10,
    attachments: r.attachments.map(fromStorageRecordAttachment),
  };
}

export {
  apiRecordFromStorageRecord,
};
