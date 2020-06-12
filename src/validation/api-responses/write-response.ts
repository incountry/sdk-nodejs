import * as t from 'io-ts';

const WriteResponseIO = t.unknown;
type WriteResponse = t.TypeOf<typeof WriteResponseIO>;

export {
  WriteResponseIO,
  WriteResponse,
};
