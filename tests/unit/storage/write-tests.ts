import * as chai from 'chai';
import * as sinon from 'sinon';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { nockPopApi, getNockedRequestBodyObject, getNockedRequestHeaders } from '../../test-helpers/popapi-nock';
import {
  COUNTRY,
  POPAPI_HOST,
  popapiResponseHeaders,
  getDefaultStorage,
  TEST_RECORDS,
  noop,
  getLoggerCallMeta,
  sdkVersionRegExp,
  checkLoggerMeta,
  EMPTY_API_RESPONSE_RECORD,
} from './common';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { Storage, WriteResult } from '../../../src/storage';
import { InputValidationError, StorageError } from '../../../src/errors';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/user-input/country-code';
import { ApiRecordData } from '../../../src/validation/api/api-record-data';
import { errorMessageRegExp } from '../../test-helpers/utils';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;


describe('Storage', () => {
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  beforeEach(() => {
    clientId = process.env.INC_CLIENT_ID;
    clientSecret = process.env.INC_CLIENT_SECRET;
    delete process.env.INC_CLIENT_ID;
    delete process.env.INC_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env.INC_CLIENT_ID = clientId;
    process.env.INC_CLIENT_SECRET = clientSecret;
  });

  describe('interface methods', () => {
    let encStorage: Storage;
    let noEncStorage: Storage;

    beforeEach(async () => {
      nock.disableNetConnect();
      encStorage = await getDefaultStorage(true);
      noEncStorage = await getDefaultStorage(false);
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('write', () => {
      let popAPI: nock.Scope;

      const nockPopApiWriteResponse = () => {
        popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200, (__, body: any) => ({
          ...EMPTY_API_RESPONSE_RECORD,
          ...body,
        }), popapiResponseHeaders);
      };

      beforeEach(() => {
        nockPopApiWriteResponse();
      });

      describe('arguments validation', () => {
        describe('request options', () => {
          const recordData = { recordKey: '123' };

          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.write(COUNTRY, recordData, requestOptions))
              .to.be.rejectedWith(InputValidationError, 'write() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.write(COUNTRY, recordData, requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.write(COUNTRY, recordData))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.write(COUNTRY, recordData, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('should validate record', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.write(undefined, {}))
              .to.be.rejectedWith(InputValidationError, errorMessageRegExp('write() Validation Error:', COUNTRY_CODE_ERROR_MESSAGE));
          });
        });

        describe('when the record has no recordKey field', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.write(COUNTRY, {}))
              .to.be.rejectedWith(InputValidationError, 'write() Validation Error: <Record>.recordKey should be string but got undefined');
          });
        });
      });

      describe('encryption', () => {
        const encryptionOptions = [{
          status: 'disabled',
          encrypted: false,
          bodyRegExp: /^pt:.+/,
          bodyDescr: 'body as base64',
        }, {
          status: 'enabled',
          encrypted: true,
          bodyRegExp: /^2:.+/,
          bodyDescr: 'encrypted body',
        }];

        encryptionOptions.forEach((opt) => {
          describe(`when ${opt.status}`, () => {
            TEST_RECORDS.forEach((testCase, idx) => {
              context(`with test case ${idx}`, () => {
                it(`should hash keys and send ${opt.bodyDescr}`, async () => {
                  const storage = opt.encrypted ? encStorage : noEncStorage;
                  const encrypted = await storage.encryptPayload(testCase);

                  const [bodyObj, result] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
                  expect(_.omit(bodyObj, ['body', 'precommit_body'])).to.deep.equal(_.omit(encrypted, ['body', 'precommit_body']));
                  expect(bodyObj.body).to.match(opt.bodyRegExp);
                  expect(result.record).to.deep.include(testCase);
                  expect(result.record).to.contain.keys('createdAt', 'updatedAt');
                });

                it('should set "is_encrypted"', async () => {
                  const storage = opt.encrypted ? encStorage : noEncStorage;

                  const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
                  expect(bodyObj.is_encrypted).to.equal(opt.encrypted);
                });

                if (testCase.expiresAt && testCase.expiresAt instanceof Date) {
                  it('should parse "expiresAt" as ISO8601', async () => {
                    const storage = opt.encrypted ? encStorage : noEncStorage;

                    const data = {
                      ...testCase,
                      expiresAt: testCase.expiresAt.toISOString(),
                    };
                    const [bodyObj, writeRes] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, data)]);
                    expect(bodyObj.expires_at).to.equal(testCase.expiresAt.toISOString());
                    expect(writeRes.record.expiresAt).to.be.a('date');
                    expect(writeRes.record.expiresAt).to.equalDate(testCase.expiresAt);
                  });
                }
              });
            });
          });
        });

        describe('when enabled', () => {
          it('should encrypt precommit_body', async () => {
            const data = {
              recordKey: '123',
              precommitBody: 'test',
            };

            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), encStorage.write(COUNTRY, data)]);
            expect(bodyObj.precommit_body).to.be.a('string');
            expect(bodyObj.precommit_body).to.not.equal(data.precommitBody);
          });
        });
      });

      describe('custom encryption', () => {
        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should write data into storage', async () => {
              const secrets = {
                secrets: [
                  {
                    secret: 'longAndStrongPassword',
                    version: 0,
                    isForCustomEncryption: true,
                  },
                ],
                currentVersion: 0,
              };

              const customEncConfigs = [{
                encrypt: (text: string) => Promise.resolve(Buffer.from(text).toString('base64')),
                decrypt: (encryptedData: string) => Promise.resolve(Buffer.from(encryptedData, 'base64').toString('utf-8')),
                version: 'customEncryption',
                isCurrent: true,
              }];

              const storage = await getDefaultStorage(true, false, () => secrets, customEncConfigs);

              const encryptedPayload = await storage.encryptPayload(testCase);

              const [bodyObj, result] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, testCase)]);
              expect(bodyObj.body).to.equal(encryptedPayload.body);
              expect(result.record).to.deep.include(testCase);
              expect(result.record).to.contain.keys('createdAt', 'updatedAt');
            });
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.write(COUNTRY, TEST_RECORDS[0])]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const recordData = { recordKey: uuid() };
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');
          await encStorage.write(COUNTRY, recordData, { meta: callMeta });
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'write');
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const record = { recordKey };
            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect((bodyObj as ApiRecordData).record_key).to.equal(storage.createKeyHash(recordKeyNormalized));
          });
        });


        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const record = { recordKey };
            const [bodyObj] = await Promise.all<any, WriteResult>([getNockedRequestBodyObject(popAPI), storage.write(COUNTRY, record)]);
            expect((bodyObj as ApiRecordData).record_key).to.equal(storage.createKeyHash(recordKey));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const storage = await getDefaultStorage();

          await storage.write('uS', { recordKey: '123' });

          nockPopApiWriteResponse();
          await storage.write('Us', { recordKey: '123' });

          nockPopApiWriteResponse();
          await storage.write('US', { recordKey: '123' });
        });
      });

      describe('normalized errors', () => {
        it('should wrap any unhandled error into StorageError and add method info', async () => {
          nock(POPAPI_HOST);

          const secrets = {
            secrets: [
              {
                secret: 'longAndStrongPassword',
                version: 0,
              },
            ],
            currentVersion: 0,
          };

          const recordKey = '123';

          const logger = { write: () => { throw new Error('blabla'); } };

          const storage = new Storage({
            encrypt: true,
            getSecrets: () => secrets,
            logger,
            oauth: { token: 'token' },
          });
          await expect(storage.write(COUNTRY, { ...EMPTY_API_RESPONSE_RECORD, recordKey })).to.be.rejectedWith(StorageError, 'Error during Storage.write() call: blabla');
        });
      });

      describe('response validation', () => {
        beforeEach(() => {
          nock.cleanAll();
        });

        it('should return StorageRecordData when POPAPI responded with not a record', async () => {
          popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200, {
            success: true,
          }, popapiResponseHeaders);

          const res = await encStorage.write(COUNTRY, TEST_RECORDS[0]);
          expect(res).to.deep.equal({ record: TEST_RECORDS[0] });
          expect(res).to.not.have.keys(['createdAt', 'updatedAt']);
        });

        it('should return StorageRecord when POPAPI responded with a correct record', async () => {
          popAPI = nockPopApi(POPAPI_HOST).write(COUNTRY).reply(200, (__, body: any) => ({
            ...EMPTY_API_RESPONSE_RECORD,
            ...body,
          }), popapiResponseHeaders);

          const res = await encStorage.write(COUNTRY, TEST_RECORDS[TEST_RECORDS.length - 1]);
          expect(res.record).to.deep.include(TEST_RECORDS[TEST_RECORDS.length - 1]);
          expect(res.record).to.contain.keys(['createdAt', 'updatedAt']);
        });
      });
    });
  });
});
