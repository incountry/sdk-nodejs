import * as t from 'io-ts';
import {
  Codec, StringMax256, DateOr8601, DateIO,
} from '../utils';

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
  key11?: string | null;
  key12?: string | null;
  key13?: string | null;
  key14?: string | null;
  key15?: string | null;
  key16?: string | null;
  key17?: string | null;
  key18?: string | null;
  key19?: string | null;
  key20?: string | null;
  parentKey?: string | null;
  serviceKey1?: string | null;
  serviceKey2?: string | null;
  serviceKey3?: string | null;
  serviceKey4?: string | null;
  serviceKey5?: string | null;
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
  expiresAt?: DateOr8601 | null;
};

const getStorageRecordDataIO = (params: { hashSearchKeys: boolean }): Codec<StorageRecordData> => {
  const keyStringIO = params.hashSearchKeys ? t.string : StringMax256;
  return t.intersection([
    t.type({
      recordKey: t.string,
    }),
    t.partial({
      body: t.union([t.string, t.null]),
      profileKey: t.union([t.string, t.null]),
      key1: t.union([keyStringIO, t.null]),
      key2: t.union([keyStringIO, t.null]),
      key3: t.union([keyStringIO, t.null]),
      key4: t.union([keyStringIO, t.null]),
      key5: t.union([keyStringIO, t.null]),
      key6: t.union([keyStringIO, t.null]),
      key7: t.union([keyStringIO, t.null]),
      key8: t.union([keyStringIO, t.null]),
      key9: t.union([keyStringIO, t.null]),
      key10: t.union([keyStringIO, t.null]),
      key11: t.union([keyStringIO, t.null]),
      key12: t.union([keyStringIO, t.null]),
      key13: t.union([keyStringIO, t.null]),
      key14: t.union([keyStringIO, t.null]),
      key15: t.union([keyStringIO, t.null]),
      key16: t.union([keyStringIO, t.null]),
      key17: t.union([keyStringIO, t.null]),
      key18: t.union([keyStringIO, t.null]),
      key19: t.union([keyStringIO, t.null]),
      key20: t.union([keyStringIO, t.null]),
      parentKey: t.union([keyStringIO, t.null]),
      precommitBody: t.union([t.string, t.null]),
      serviceKey1: t.union([t.string, t.null]),
      serviceKey2: t.union([t.string, t.null]),
      serviceKey3: t.union([t.string, t.null]),
      serviceKey4: t.union([t.string, t.null]),
      serviceKey5: t.union([t.string, t.null]),
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
      expiresAt: t.union([DateIO, t.null]),
    }),
  ], 'Record');
};

export {
  StorageRecordData,
  getStorageRecordDataIO,
};
