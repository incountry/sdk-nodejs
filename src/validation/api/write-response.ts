import * as t from 'io-ts';
import { ApiRecordIO } from './api-record';

const WriteResponseIO = ApiRecordIO;
type WriteResponse = t.TypeOf<typeof WriteResponseIO>;

export {
  WriteResponseIO,
  WriteResponse,
};
