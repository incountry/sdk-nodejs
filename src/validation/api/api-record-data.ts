import { ApiRecord } from './api-record';
import { StorageRecordData } from '../storage-record-data';
import { omitUndefined } from '../../utils';

type ApiRecordData = {
  record_key: string;
  body?: string | null;
} & Partial<Omit<ApiRecord, 'record_key' | 'body'>>

function apiRecordDataFromStorageRecordData<A extends StorageRecordData>(r: A): ApiRecordData {
  return omitUndefined({
    record_key: r.recordKey,
    body: r.body,
    precommit_body: r.precommitBody,
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
    parent_key: r.parentKey,
  });
}

export {
  ApiRecordData,
  apiRecordDataFromStorageRecordData,
};
