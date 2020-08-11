import { StorageRecord } from './storage-record';
import { ApiRecord } from './api/api-record';
import { StorageRecordData } from './storage-record-data';
import { ApiRecordData } from './api/api-record-data';
import { omitUndefined } from '../utils';

function apiRecordFromStorageRecord(r: StorageRecord): ApiRecord {
  return {
    record_key: r.recordKey,
    body: typeof r.body === 'string' ? r.body : '',
    precommit_body: r.precommitBody,
    version: r.version,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    is_encrypted: r.isEncrypted,
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
  };
}

function apiRecordDataFromStorageRecordData<A extends StorageRecordData>(r: A): ApiRecordData {
  return omitUndefined({
    record_key: r.recordKey,
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
  });
}

function storageRecordToStorageRecordData(r: StorageRecord): StorageRecordData {
  const {
    version,
    createdAt,
    updatedAt,
    isEncrypted,
    ...rest
  } = r;
  return {
    ...rest,
  };
}

function filter2(filter: any): any {
  return omitUndefined({
    record_key: filter.recordKey,
    key1: filter.key1,
    key2: filter.key2,
    key3: filter.key3,
    key4: filter.key4,
    key5: filter.key5,
    key6: filter.key6,
    key7: filter.key7,
    key8: filter.key8,
    key9: filter.key9,
    key10: filter.key10,
    service_key1: filter.serviceKey1,
    service_key2: filter.serviceKey2,
    profile_key: filter.profileKey,
    range_key1: filter.rangeKey1,
    range_key2: filter.rangeKey2,
    range_key3: filter.rangeKey3,
    range_key4: filter.rangeKey4,
    range_key5: filter.rangeKey5,
    range_key6: filter.rangeKey6,
    range_key7: filter.rangeKey7,
    range_key8: filter.rangeKey8,
    range_key9: filter.rangeKey9,
    range_key10: filter.rangeKey10,
  });
}

export {
  apiRecordFromStorageRecord,
  apiRecordDataFromStorageRecordData,
  storageRecordToStorageRecordData,
  filter2,
};
