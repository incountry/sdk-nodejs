import * as t from 'io-ts';
import { StorageRecordData } from './storage-record-data';
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

function fromApiRecord(r: ApiRecord): StorageRecord {
  return {
    recordKey: r.record_key,
    body: r.body,
    precommitBody: r.precommit_body,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    profileKey: r.profile_key,
    rangeKey1: r.range_key1,
    rangeKey2: r.range_key2,
    rangeKey3: r.range_key3,
    rangeKey4: r.range_key4,
    rangeKey5: r.range_key5,
    rangeKey6: r.range_key6,
    rangeKey7: r.range_key7,
    rangeKey8: r.range_key8,
    rangeKey9: r.range_key9,
    rangeKey10: r.range_key10,
    serviceKey1: r.service_key1,
    serviceKey2: r.service_key2,
    parentKey: r.parent_key,
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
    key11: r.key11,
    key12: r.key12,
    key13: r.key13,
    key14: r.key14,
    key15: r.key15,
    key16: r.key16,
    key17: r.key17,
    key18: r.key18,
    key19: r.key19,
    key20: r.key20,
    attachments: r.attachments.map(fromApiRecordAttachment),
  };
}

export {
  StorageRecord,
  StorageRecordAttachment,
  fromApiRecord,
  fromApiRecordAttachment,
};
