import * as t from 'io-ts';
import { ApiRecordIO } from './api-record';

const BatchWriteResponseIO = t.array(ApiRecordIO);
type BatchWriteResponse = t.TypeOf<typeof BatchWriteResponseIO>;

export {
  BatchWriteResponseIO,
  BatchWriteResponse,
};
