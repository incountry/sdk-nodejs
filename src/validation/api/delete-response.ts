import * as t from 'io-ts';

const DeleteResponseIO = t.unknown;
type DeleteResponse = t.TypeOf<typeof DeleteResponseIO>;

export {
  DeleteResponseIO,
  DeleteResponse,
};
