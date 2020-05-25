import * as t from 'io-ts';
import { nullable } from '../utils';

const RecordResponseIO = t.type({
  key: t.string,
  body: t.string,
  version: t.Int,
  profile_key: nullable(t.string),
  range_key: nullable(t.Int),
  key2: nullable(t.string),
  key3: nullable(t.string),
}, 'RecordResponse');

export {
  RecordResponseIO,
};
