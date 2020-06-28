import * as t from 'io-ts';
import { JSONIO } from '../utils';

const RecordBodyIO = t.intersection([
  t.type({
    meta: t.record(t.string, t.string),
  }),
  t.partial({
    payload: t.string,
  }),
], 'RecordBody');

const RecordBodyFromString = t.string.pipe(JSONIO.pipe(RecordBodyIO));

const RecordResponseIO = t.type({
  key: t.string,
  body: t.string,
  version: t.Int,
  profile_key: t.union([t.null, t.string]),
  range_key: t.union([t.null, t.Int]),
  key2: t.union([t.null, t.string]),
  key3: t.union([t.null, t.string]),
}, 'RecordResponse');

type RecordResponse = t.TypeOf<typeof RecordResponseIO>

export {
  RecordBodyFromString as RecordBodyIO,
  RecordResponseIO,
  RecordResponse,
};
