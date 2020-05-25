import * as t from 'io-ts';
import { RecordResponseIO } from './record-response';

const FindResponseIO = t.type({
  meta: t.type({
    count: t.Int,
    limit: t.Int,
    offset: t.Int,
    total: t.Int,
  }),
  data: t.array(RecordResponseIO),
}, 'FindResponse');

export {
  FindResponseIO,
};
