import * as chai from 'chai';
import { v4 as uuid } from 'uuid';

import { Int } from '../../../src/validation/utils';
import { ApiRecord } from '../../../src/validation/api/api-record';
import { FindResponse } from '../../../src/validation/api/find-response';
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

const EMPTY_API_RECORD = {
  body: '',
  version: 0 as Int,
  created_at: new Date(),
  updated_at: new Date(),
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

const EMPTY_API_ATTACHMENT_META = {
  file_id: '',
  filename: '',
  hash: '',
  mime_type: '',
  size: 123,
  created_at: new Date(),
  updated_at: new Date(),
  download_link: '',
};

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
  },
];

const LOGGER_STUB = () => ({ write: (a: string, b: string, c: any) => [a, b, c] });

const defaultGetSecretsCallback = () => SECRET_KEY;

const getDefaultFindResponse = (data: ApiRecord[] = [], limit = 100, offset = 0): FindResponse => ({
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
  EMPTY_API_RECORD,
  EMPTY_API_ATTACHMENT_META,
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
