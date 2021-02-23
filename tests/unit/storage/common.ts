import * as chai from 'chai';
import { v4 as uuid } from 'uuid';
import { isRight } from 'fp-ts/lib/Either';

import {
  Int,
  getErrorMessage,
} from '../../../src/validation/utils';
import { ApiRecordIO } from '../../../src/validation/api/api-record';
import { CustomEncryptionConfig } from '../../../src/validation/custom-encryption-configs';
import { createStorage } from '../../../src/storage';


const { expect } = chai;

const noop = () => {};

const COUNTRY = 'us';
const SECRET_KEY = 'password';
const POPAPI_HOST = `https://${COUNTRY}.api.incountry.io`;
const PORTAL_BACKEND_HOST = 'portal-backend.incountry.com';
const PORTAL_BACKEND_COUNTRIES_LIST_PATH = '/countries';
const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
const sdkVersionRegExp = /^SDK-Node\.js\/\d+\.\d+\.\d+/;
const popapiResponseHeaders = { 'x-inc-corr-id-resp': uuid(), alpha: 'beta', gamma: 'delta' };

const EMPTY_API_RESPONSE_ATTACHMENT_META = {
  file_id: '',
  filename: '',
  hash: '',
  mime_type: '',
  size: 123,
  created_at: (new Date()).toISOString(),
  updated_at: (new Date()).toISOString(),
  download_link: '',
};

const EMPTY_API_RESPONSE_RECORD = {
  record_key: '',
  body: '',
  version: 0,
  created_at: (new Date()).toISOString(),
  updated_at: (new Date()).toISOString(),
  expires_at: null,
  is_encrypted: false,
  precommit_body: null,
  parent_key: null,
  key1: null,
  key2: null,
  key3: null,
  key4: null,
  key5: null,
  key6: null,
  key7: null,
  key8: null,
  key9: null,
  key10: null,
  key11: null,
  key12: null,
  key13: null,
  key14: null,
  key15: null,
  key16: null,
  key17: null,
  key18: null,
  key19: null,
  key20: null,
  service_key1: null,
  service_key2: null,
  service_key3: null,
  service_key4: null,
  service_key5: null,
  profile_key: null,
  range_key1: null,
  range_key2: null,
  range_key3: null,
  range_key4: null,
  range_key5: null,
  range_key6: null,
  range_key7: null,
  range_key8: null,
  range_key9: null,
  range_key10: null,
  attachments: [],
};

type ApiResponseRecord = {
  record_key: string;
  body: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_encrypted: boolean | null;
  precommit_body: string | null;
  parent_key: string | null;
  key1: string | null;
  key2: string | null;
  key3: string | null;
  key4: string | null;
  key5: string | null;
  key6: string | null;
  key7: string | null;
  key8: string | null;
  key9: string | null;
  key10: string | null;
  key11: string | null;
  key12: string | null;
  key13: string | null;
  key14: string | null;
  key15: string | null;
  key16: string | null;
  key17: string | null;
  key18: string | null;
  key19: string | null;
  key20: string | null;
  service_key1: string | null;
  service_key2: string | null;
  service_key3: string | null;
  service_key4: string | null;
  service_key5: string | null;
  profile_key: string | null;
  range_key1: number | null;
  range_key2: number | null;
  range_key3: number | null;
  range_key4: number | null;
  range_key5: number | null;
  range_key6: number | null;
  range_key7: number | null;
  range_key8: number | null;
  range_key9: number | null;
  range_key10: number | null;
  attachments: Array<typeof EMPTY_API_RESPONSE_ATTACHMENT_META>;
};

const toApiRecord = (i: unknown) => {
  const r = ApiRecordIO.decode(i);
  if (isRight(r)) return r.right;
  throw new Error(getErrorMessage(r));
};

const EMPTY_API_RECORD = toApiRecord(EMPTY_API_RESPONSE_RECORD);

const TEST_RECORDS = [
  {
    recordKey: uuid(),
  },
  {
    recordKey: uuid(),
    body: 'test',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    key4: 'key4',
    key5: 'key5',
    key6: 'key6',
    key7: 'key7',
    key8: 'key8',
    key9: 'key9',
    key10: 'key10',
    serviceKey1: 'serviceKey1',
    serviceKey2: 'serviceKey2',
    profileKey: 'profile_key',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    key4: 'key4',
    key5: 'key5',
    key6: 'key6',
    key7: 'key7',
    key8: 'key8',
    key9: 'key9',
    key10: 'key10',
    key11: 'key11',
    key12: 'key12',
    key13: 'key13',
    key14: 'key14',
    key15: 'key15',
    key16: 'key16',
    key17: 'key17',
    key18: 'key18',
    key19: 'key19',
    key20: 'key20',
    serviceKey1: 'serviceKey1',
    serviceKey2: 'serviceKey2',
    serviceKey3: 'serviceKey3',
    serviceKey4: 'serviceKey4',
    serviceKey5: 'serviceKey5',
    profileKey: 'profile_key',
    parentKey: 'parent_key',
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    rangeKey1: 1 as Int,
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    rangeKey1: 1 as Int,
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    serviceKey1: 'service_key1',
    rangeKey1: 1 as Int,
  },
  {
    recordKey: uuid(),
    body: 'test',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    profileKey: 'profile_key',
    serviceKey1: 'service_key1',
    rangeKey1: 1 as Int,
    precommitBody: 'test',
    expiresAt: new Date(),
  },
];

const LOGGER_STUB = () => ({ write: (a: string, b: string, c: any) => [a, b, c] });

const defaultGetSecretsCallback = () => SECRET_KEY;

const getDefaultFindResponse = (data: ApiResponseRecord[] = [], limit = 100, offset = 0) => ({
  meta: {
    total: data.length, count: data.length, limit, offset,
  },
  data,
});

const getLoggerCallMeta = (loggerSpy: sinon.SinonSpy) => {
  const loggerInfoCalls = loggerSpy.args.filter((args) => args[0] === 'info');
  return loggerInfoCalls[loggerInfoCalls.length - 1][2];
};

const checkLoggerMeta = (actualLoggerMeta: any, meta: any, opName: string) => {
  expect(actualLoggerMeta).to.be.an('object');
  expect(actualLoggerMeta).to.deep.include({
    country: COUNTRY,
    operation: opName,
    op_result: 'success',
    ...meta,
  });
  expect(actualLoggerMeta).to.contain.keys('requestHeaders', 'responseHeaders');
  expect(actualLoggerMeta.responseHeaders).to.deep.include(popapiResponseHeaders);
};

const getDefaultStorage = async (
  encrypt = false,
  normalizeKeys = false,
  getSecrets: Function = defaultGetSecretsCallback,
  customEncConfigs?: CustomEncryptionConfig[],
) => createStorage({
  apiKey: 'string',
  environmentId: 'string',
  endpoint: POPAPI_HOST,
  encrypt,
  normalizeKeys,
  getSecrets,
  logger: LOGGER_STUB(),
}, customEncConfigs);

export {
  defaultGetSecretsCallback,
  popapiResponseHeaders,
  COUNTRY,
  POPAPI_HOST,
  PORTAL_BACKEND_HOST,
  PORTAL_BACKEND_COUNTRIES_LIST_PATH,
  LOGGER_STUB,
  EMPTY_API_RESPONSE_ATTACHMENT_META,
  EMPTY_API_RESPONSE_RECORD,
  EMPTY_API_RECORD,
  ApiResponseRecord,
  toApiRecord,
  TEST_RECORDS,
  noop,
  sdkVersionRegExp,
  getLoggerCallMeta,
  checkLoggerMeta,
  getDefaultFindResponse,
  REQUEST_TIMEOUT_ERROR,
  SECRET_KEY,
  getDefaultStorage,
};
