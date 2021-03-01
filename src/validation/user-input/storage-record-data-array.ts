import * as t from 'io-ts';
import {
  left, right, Either, either,
} from 'fp-ts/lib/Either';
import { getStorageRecordDataIO, StorageRecordData } from './storage-record-data';
import { Codec, chainValidate } from '../utils';

const MAX_RECORDS_IN_BATCH = 100;
const STORAGE_RECORD_DATA_ARRAY_EMPTY_ERROR = 'You must pass non-empty array of records';
const STORAGE_RECORD_DATA_ARRAY_TOO_BIG_ERROR = `You must pass array of not more than ${MAX_RECORDS_IN_BATCH} records`;

const validateArray = <A>(records: A[]): Either<string, A[]> => {
  if (records.length === 0) {
    return left(STORAGE_RECORD_DATA_ARRAY_EMPTY_ERROR);
  }

  if (records.length > MAX_RECORDS_IN_BATCH) {
    return left(STORAGE_RECORD_DATA_ARRAY_TOO_BIG_ERROR);
  }

  return right(records);
};

const arrayOfSpecificLength = chainValidate(t.UnknownArray, validateArray);

const getStorageRecordDataArrayIO = (params: { hashSearchKeys: boolean }): Codec<StorageRecordData[]> => {
  const StorageRecordDataIO = getStorageRecordDataIO(params);
  const StorageRecordsIO = t.array(StorageRecordDataIO);

  return new t.Type(
    'RecordsArray',
    (u): u is Array<StorageRecordData> => arrayOfSpecificLength.is(u) && StorageRecordsIO.is(u),
    (u, c) => either.chain(arrayOfSpecificLength.validate(u, c), (arr) => StorageRecordsIO.validate(arr, c)),
    Array,
  );
};

export {
  getStorageRecordDataArrayIO,
  MAX_RECORDS_IN_BATCH,
  STORAGE_RECORD_DATA_ARRAY_EMPTY_ERROR,
  STORAGE_RECORD_DATA_ARRAY_TOO_BIG_ERROR,
};
