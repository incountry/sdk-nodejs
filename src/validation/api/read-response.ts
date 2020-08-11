import * as t from 'io-ts';
import { ApiRecordIO } from './api-record';

const ReadResponseIO = ApiRecordIO;
type ReadResponse = t.TypeOf<typeof ReadResponseIO>;

export {
  ReadResponseIO,
  ReadResponse,
};
