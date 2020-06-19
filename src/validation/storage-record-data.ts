import * as t from 'io-ts';
import { withValidate } from 'io-ts-types/lib/withValidate';
import { either } from 'fp-ts/lib/Either';
import { omitNulls } from '../utils';

type StorageRecordData = {
  key: string;
  body?: string | null;
  profile_key?: string | null;
  key2?: string | null;
  key3?: string | null;
  range_key?: t.Int | null;
};

const StorageRecordDataIO: t.Type<StorageRecordData> = t.intersection([
  t.type({
    key: t.string,
  }),
  t.partial({
    body: t.union([t.string, t.null]),
    profile_key: t.union([t.string, t.null]),
    key2: t.union([t.string, t.null]),
    key3: t.union([t.string, t.null]),
    range_key: t.union([t.Int, t.null]),
  }),
], 'Record');

const StorageRecordDataWithoutNullsIO = withValidate(StorageRecordDataIO, (u, c) => either.map(StorageRecordDataIO.validate(u, c), omitNulls));

export {
  StorageRecordData,
  StorageRecordDataWithoutNullsIO as StorageRecordDataIO,
};
