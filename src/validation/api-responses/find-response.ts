import * as t from 'io-ts';
import { ApiRecordIO, ApiRecord } from './api-record';

type FindResponseMeta = {
  total: number;
  count: number;
  limit: number;
  offset: number;
}

type FindResponse = {
  meta: FindResponseMeta;
  data: ApiRecord[];
}

const FindResponseIO = t.type({
  meta: t.type({
    count: t.Int,
    limit: t.Int,
    offset: t.Int,
    total: t.Int,
  }),
  data: t.array(ApiRecordIO),
}, 'FindResponse');

export {
  FindResponseIO,
  FindResponse,
  FindResponseMeta,
};
