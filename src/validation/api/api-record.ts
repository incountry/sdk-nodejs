import * as t from 'io-ts';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';
import { JSONIO } from '../utils';

const ApiRecordBodyIO = t.intersection([
  t.type({
    meta: t.record(t.string, t.union([t.string, t.null])),
  }),
  t.partial({
    payload: t.union([t.string, t.null]),
  }),
], 'RecordBody');

const ApiRecordBodyFromString = t.string.pipe(JSONIO.pipe(ApiRecordBodyIO), 'ApiRecordBody');

const ApiRecordIO = t.type({
  record_key: t.string,
  body: t.string,
  precommit_body: t.union([t.null, t.string]),
  version: t.Int,
  is_encrypted: t.boolean,
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

type ApiRecord = t.TypeOf<typeof ApiRecordIO>

export {
  ApiRecordBodyFromString as ApiRecordBodyIO,
  ApiRecordIO,
  ApiRecord,
};
