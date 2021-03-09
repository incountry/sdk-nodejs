import * as t from 'io-ts';
import { StorageRecordData } from '../user-input/storage-record-data';
import { omitUndefined } from '../../utils';

type ApiRecordData = {
  record_key: string;
  body?: null | string;
  precommit_body?: null | string;
  version?: t.Int;
  is_encrypted?: null | boolean;
  expires_at?: string | null;
  profile_key?: null | string;
  range_key1?: null | t.Int;
  range_key2?: null | t.Int;
  range_key3?: null | t.Int;
  range_key4?: null | t.Int;
  range_key5?: null | t.Int;
  range_key6?: null | t.Int;
  range_key7?: null | t.Int;
  range_key8?: null | t.Int;
  range_key9?: null | t.Int;
  range_key10?: null | t.Int;
  service_key1?: null | string;
  service_key2?: null | string;
  service_key3?: null | string;
  service_key4?: null | string;
  service_key5?: null | string;
  key1?: null | string;
  key2?: null | string;
  key3?: null | string;
  key4?: null | string;
  key5?: null | string;
  key6?: null | string;
  key7?: null | string;
  key8?: null | string;
  key9?: null | string;
  key10?: null | string;
  key11?: null | string;
  key12?: null | string;
  key13?: null | string;
  key14?: null | string;
  key15?: null | string;
  key16?: null | string;
  key17?: null | string;
  key18?: null | string;
  key19?: null | string;
  key20?: null | string;
  parent_key?: null | string;
};

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
    service_key3: recordData.serviceKey3,
    service_key4: recordData.serviceKey4,
    service_key5: recordData.serviceKey5,
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
    expires_at: recordData.expiresAt ? recordData.expiresAt.toISOString() : recordData.expiresAt,
  });
}

export {
  ApiRecordData,
  apiRecordDataFromStorageRecordData,
};
