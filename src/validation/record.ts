import * as t from 'io-ts';
import { withValidate } from 'io-ts-types/lib/withValidate';
import { either } from 'fp-ts/lib/Either';
import { nullable } from './utils';
import { omitNulls } from '../utils';

type StorageRecord = {
  key: string;
  version?: number;
  body?: string | null;
  profile_key?: string | null;
  key2?: string | null;
  key3?: string | null;
  range_key?: number | null;
};

type StorageRecordValidated = {
  key: string;
  version?: t.Int;
  body?: string | null;
  profile_key?: string | null;
  key2?: string | null;
  key3?: string | null;
  range_key?: number | null;
};

const StorageRecordIO: t.Type<StorageRecordValidated> = t.intersection([
  t.type({
    key: t.string,
  }),
  t.partial({
    version: t.Int,
    body: nullable(t.string),
    profile_key: nullable(t.string),
    key2: nullable(t.string),
    key3: nullable(t.string),
    range_key: nullable(t.Int),
  }),
], 'Record');

const StorageRecordWithoutNullsIO = withValidate(StorageRecordIO, (u, c) => either.map(StorageRecordIO.validate(u, c), omitNulls));

export {
  StorageRecord,
  StorageRecordWithoutNullsIO as StorageRecordIO,
};
