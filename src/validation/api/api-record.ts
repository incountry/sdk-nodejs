import * as t from 'io-ts';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';
import { JSONIO, Codec } from '../utils';

const ApiRecordBodyIO = t.intersection([
  t.type({
    meta: t.record(t.string, t.union([t.string, t.null])),
  }),
  t.partial({
    payload: t.union([t.string, t.null]),
  }),
], 'RecordBody');

const ApiRecordBodyFromString = t.string.pipe(JSONIO.pipe(ApiRecordBodyIO), 'ApiRecordBody');

type ApiRecord = {
  record_key: string;
  body: string;
  precommit_body: null | string;
  version: t.Int;
  is_encrypted: null | boolean;
  created_at: Date;
  updated_at: Date;
  profile_key: null | string;
  range_key1: null | t.Int;
  range_key2: null | t.Int;
  range_key3: null | t.Int;
  range_key4: null | t.Int;
  range_key5: null | t.Int;
  range_key6: null | t.Int;
  range_key7: null | t.Int;
  range_key8: null | t.Int;
  range_key9: null | t.Int;
  range_key10: null | t.Int;
  service_key1: null | string;
  service_key2: null | string;
  key1: null | string;
  key2: null | string;
  key3: null | string;
  key4: null | string;
  key5: null | string;
  key6: null | string;
  key7: null | string;
  key8: null | string;
  key9: null | string;
  key10: null | string;
}

const ApiRecordIO: Codec<ApiRecord> = t.type({
  record_key: t.string,
  body: t.string,
  precommit_body: t.union([t.null, t.string]),
  version: t.Int,
  is_encrypted: t.union([t.null, t.boolean]),
  created_at: DateFromISOString,
  updated_at: DateFromISOString,
  profile_key: t.union([t.null, t.string]),
  range_key1: t.union([t.null, t.Int]),
  range_key2: t.union([t.null, t.Int]),
  range_key3: t.union([t.null, t.Int]),
  range_key4: t.union([t.null, t.Int]),
  range_key5: t.union([t.null, t.Int]),
  range_key6: t.union([t.null, t.Int]),
  range_key7: t.union([t.null, t.Int]),
  range_key8: t.union([t.null, t.Int]),
  range_key9: t.union([t.null, t.Int]),
  range_key10: t.union([t.null, t.Int]),
  service_key1: t.union([t.null, t.string]),
  service_key2: t.union([t.null, t.string]),
  key1: t.union([t.null, t.string]),
  key2: t.union([t.null, t.string]),
  key3: t.union([t.null, t.string]),
  key4: t.union([t.null, t.string]),
  key5: t.union([t.null, t.string]),
  key6: t.union([t.null, t.string]),
  key7: t.union([t.null, t.string]),
  key8: t.union([t.null, t.string]),
  key9: t.union([t.null, t.string]),
  key10: t.union([t.null, t.string]),
}, 'ApiRecord');

export {
  ApiRecordBodyFromString as ApiRecordBodyIO,
  ApiRecordIO,
  ApiRecord,
};
