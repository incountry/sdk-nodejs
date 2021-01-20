import { ApiRecord } from './api-record';
import { StorageRecordData } from '../storage-record-data';
import { omitUndefined } from '../../utils';

type ApiRecordData = {
  record_key: string;
  body?: string | null;
} & Partial<Omit<ApiRecord, 'record_key' | 'body'>>

function apiRecordDataFromStorageRecordData<A extends StorageRecordData>(recordData: A): ApiRecordData {
  return omitUndefined({
    record_key: recordData.recordKey,
    body: recordData.body,
    precommit_body: recordData.precommitBody,
    profile_key: recordData.profileKey,
    range_key1: recordData.rangeKey1,
    range_key2: recordData.rangeKey2,
    range_key3: recordData.rangeKey3,
    range_key4: recordData.rangeKey4,
    range_key5: recordData.rangeKey5,
    range_key6: recordData.rangeKey6,
    range_key7: recordData.rangeKey7,
    range_key8: recordData.rangeKey8,
    range_key9: recordData.rangeKey9,
    range_key10: recordData.rangeKey10,
    service_key1: recordData.serviceKey1,
    service_key2: recordData.serviceKey2,
    key1: recordData.key1,
    key2: recordData.key2,
    key3: recordData.key3,
    key4: recordData.key4,
    key5: recordData.key5,
    key6: recordData.key6,
    key7: recordData.key7,
    key8: recordData.key8,
    key9: recordData.key9,
    key10: recordData.key10,
    key11: recordData.key11,
    key12: recordData.key12,
    key13: recordData.key13,
    key14: recordData.key14,
    key15: recordData.key15,
    key16: recordData.key16,
    key17: recordData.key17,
    key18: recordData.key18,
    key19: recordData.key19,
    key20: recordData.key20,
    parent_key: recordData.parentKey,
  });
}

export {
  ApiRecordData,
  apiRecordDataFromStorageRecordData,
};
