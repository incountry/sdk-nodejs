import * as t from 'io-ts';
import { StorageRecordData } from './user-input/storage-record-data';
import { ApiRecord } from './api/api-record';
import { ApiRecordAttachment } from './api/api-record-attachment';

type StorageRecordAttachment = {
  fileId: string;
  fileName: string;
  hash: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  downloadLink: string;
}

function fromApiRecordAttachment(a: ApiRecordAttachment): StorageRecordAttachment {
  return {
    fileId: a.file_id,
    fileName: a.filename,
    hash: a.hash,
    mimeType: a.mime_type,
    size: a.size,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    downloadLink: a.download_link,
  };
}

type StorageRecord =
  Required<StorageRecordData>
  & {
    version: t.Int;
    createdAt: Date;
    updatedAt: Date;
    attachments: StorageRecordAttachment[];
  }

function fromApiRecord(apiRecord: ApiRecord): StorageRecord {
  return {
    recordKey: apiRecord.record_key,
    body: apiRecord.body,
    precommitBody: apiRecord.precommit_body,
    version: apiRecord.version,
    createdAt: apiRecord.created_at,
    updatedAt: apiRecord.updated_at,
    expiresAt: apiRecord.expires_at,
    profileKey: apiRecord.profile_key,
    rangeKey1: apiRecord.range_key1,
    rangeKey2: apiRecord.range_key2,
    rangeKey3: apiRecord.range_key3,
    rangeKey4: apiRecord.range_key4,
    rangeKey5: apiRecord.range_key5,
    rangeKey6: apiRecord.range_key6,
    rangeKey7: apiRecord.range_key7,
    rangeKey8: apiRecord.range_key8,
    rangeKey9: apiRecord.range_key9,
    rangeKey10: apiRecord.range_key10,
    serviceKey1: apiRecord.service_key1,
    serviceKey2: apiRecord.service_key2,
    serviceKey3: apiRecord.service_key3,
    serviceKey4: apiRecord.service_key4,
    serviceKey5: apiRecord.service_key5,
    parentKey: apiRecord.parent_key,
    key1: apiRecord.key1,
    key2: apiRecord.key2,
    key3: apiRecord.key3,
    key4: apiRecord.key4,
    key5: apiRecord.key5,
    key6: apiRecord.key6,
    key7: apiRecord.key7,
    key8: apiRecord.key8,
    key9: apiRecord.key9,
    key10: apiRecord.key10,
    key11: apiRecord.key11,
    key12: apiRecord.key12,
    key13: apiRecord.key13,
    key14: apiRecord.key14,
    key15: apiRecord.key15,
    key16: apiRecord.key16,
    key17: apiRecord.key17,
    key18: apiRecord.key18,
    key19: apiRecord.key19,
    key20: apiRecord.key20,
    attachments: apiRecord.attachments.map(fromApiRecordAttachment),
  };
}

export {
  StorageRecord,
  StorageRecordAttachment,
  fromApiRecord,
  fromApiRecordAttachment,
};
