import * as t from 'io-ts';
import { withValidate } from 'io-ts-types/lib/withValidate';
import { either } from 'fp-ts/lib/Either';
import { omitNulls } from '../utils';

type StorageRecordData = {
  recordKey: string;
  body?: string | null;
  profileKey?: string | null;
  precommitBody?: string | null;
  key1?: string | null;
  key2?: string | null;
  key3?: string | null;
  key4?: string | null;
  key5?: string | null;
  key6?: string | null;
  key7?: string | null;
  key8?: string | null;
  key9?: string | null;
  key10?: string | null;
  serviceKey1?: string | null;
  serviceKey2?: string | null;
  rangeKey1?: t.Int | null;
  rangeKey2?: t.Int | null;
  rangeKey3?: t.Int | null;
  rangeKey4?: t.Int | null;
  rangeKey5?: t.Int | null;
  rangeKey6?: t.Int | null;
  rangeKey7?: t.Int | null;
  rangeKey8?: t.Int | null;
  rangeKey9?: t.Int | null;
  rangeKey10?: t.Int | null;
};

const StorageRecordDataIO: t.Type<StorageRecordData> = t.intersection([
  t.type({
    recordKey: t.string,
  }),
  t.partial({
    body: t.union([t.string, t.null]),
    profileKey: t.union([t.string, t.null]),
    key1: t.union([t.string, t.null]),
    key2: t.union([t.string, t.null]),
    key3: t.union([t.string, t.null]),
    key4: t.union([t.string, t.null]),
    key5: t.union([t.string, t.null]),
    key6: t.union([t.string, t.null]),
    key7: t.union([t.string, t.null]),
    key8: t.union([t.string, t.null]),
    key9: t.union([t.string, t.null]),
    key10: t.union([t.string, t.null]),
    precommitBody: t.union([t.string, t.null]),
    serviceKey1: t.union([t.string, t.null]),
    serviceKey2: t.union([t.string, t.null]),
    rangeKey1: t.union([t.Int, t.null]),
    rangeKey2: t.union([t.Int, t.null]),
    rangeKey3: t.union([t.Int, t.null]),
    rangeKey4: t.union([t.Int, t.null]),
    rangeKey5: t.union([t.Int, t.null]),
    rangeKey6: t.union([t.Int, t.null]),
    rangeKey7: t.union([t.Int, t.null]),
    rangeKey8: t.union([t.Int, t.null]),
    rangeKey9: t.union([t.Int, t.null]),
    rangeKey10: t.union([t.Int, t.null]),
  }),
], 'Record');

const StorageRecordDataWithoutNullsIO = withValidate(StorageRecordDataIO, (u, c) => either.map(StorageRecordDataIO.validate(u, c), omitNulls));

export {
  StorageRecordData,
  StorageRecordDataWithoutNullsIO,
  // StorageRecordDataWithoutNullsIO as StorageRecordDataIO,
  StorageRecordDataIO,
};
