import * as t from 'io-ts';
import { StorageRecordIO, StorageRecord } from './record';

const StorageRecordsIO = t.array(StorageRecordIO);

const StorageRecordsNEAIO = new t.Type(
  'RecordsArray',
  (u): u is Array<StorageRecord> => StorageRecordsIO.is(u) && u.length > 0,
  (u, c) => {
    if (!t.UnknownArray.is(u) || u.length === 0) {
      return t.failure(u, c, 'You must pass non-empty array of records');
    }

    return StorageRecordsIO.validate(u, c);
  },
  Array,
);

export {
  StorageRecordsNEAIO,
};
