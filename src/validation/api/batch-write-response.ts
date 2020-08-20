import * as t from 'io-ts';

const BatchWriteResponseIO = t.unknown;
type BatchWriteResponse = t.TypeOf<typeof BatchWriteResponseIO>;

export {
  BatchWriteResponseIO,
  BatchWriteResponse,
};
