import * as t from 'io-ts';
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
  key: t.string,
  body: t.string,
  version: t.Int,
  profile_key: t.union([t.null, t.string]),
  range_key: t.union([t.null, t.Int]),
  key2: t.union([t.null, t.string]),
  key3: t.union([t.null, t.string]),
}, 'ApiRecord');

type ApiRecord = t.TypeOf<typeof ApiRecordIO>

export {
  ApiRecordBodyFromString as ApiRecordBodyIO,
  ApiRecordIO,
  ApiRecord,
};
