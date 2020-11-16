import * as t from 'io-ts';
import { getStorageRecordDataIO, StorageRecordData } from './storage-record-data';
import { Codec } from './utils';

const getStorageRecordDataArrayIO = (params: { hashSearchKeys: boolean }): Codec<StorageRecordData[]> => {
  const StorageRecordDataIO = getStorageRecordDataIO(params);
  const StorageRecordsIO = t.array(StorageRecordDataIO);

  const StorageRecordDataArrayIO = new t.Type(
    'RecordsArray',
    (u): u is Array<StorageRecordData> => StorageRecordsIO.is(u) && u.length > 0,
    (u, c) => {
      if (!t.UnknownArray.is(u) || u.length === 0) {
        return t.failure(u, c, 'You must pass non-empty array of records');
      }

      return StorageRecordsIO.validate(u, c);
    },
    Array,
  );

  return StorageRecordDataArrayIO;
};

export {
  getStorageRecordDataArrayIO,
};
