import * as t from 'io-ts';
import { StorageRecordData } from './storage-record-data';
import { ApiRecord } from './api/api-record';

type StorageRecord =
  Required<StorageRecordData>
  & {
    version: t.Int;
    createdAt: Date;
    updatedAt: Date;
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
  };
}

export {
  StorageRecord,
  fromApiRecord,
};
