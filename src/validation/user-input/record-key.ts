import * as t from 'io-ts';

const RECORD_KEY_ERROR_MESSAGE = 'Record key must be a non-empty string';

const RecordKeyIO = new t.Type(
  'RecordKey',
  (u): u is string => t.string.is(u) && u.length > 0,
  (u, c) => {
    if (!t.string.is(u) || u.length === 0) {
      return t.failure(u, c, RECORD_KEY_ERROR_MESSAGE);
    }

    return t.success(u);
  },
  String,
);

export {
  RECORD_KEY_ERROR_MESSAGE,
  RecordKeyIO,
};
