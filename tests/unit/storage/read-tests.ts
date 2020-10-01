import * as chai from 'chai';
import * as sinon from 'sinon';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import { Storage } from '../../../src/storage';
import {
  getDefaultStorage,
  COUNTRY,
  TEST_RECORDS,
  POPAPI_HOST,
  EMPTY_API_RECORD,
  sdkVersionRegExp,
  getLoggerCallMeta,
  checkLoggerMeta,
  popapiResponseHeaders,
  noop,
} from './common';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { StorageError } from '../../../src/errors';
import { nockPopApi, getNockedRequestHeaders } from '../../test-helpers/popapi-nock';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { RECORD_KEY_ERROR_MESSAGE } from '../../../src/validation/record-key';


const { expect, assert } = chai;


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

    describe('read', () => {
      describe('arguments validation', () => {
        describe('when no country provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.read(undefined, ''))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE);
          });
        });

        describe('when no key provided', () => {
          it('should throw an error', async () => {
            // @ts-ignore
            await expect(encStorage.read(COUNTRY, undefined))
              .to.be.rejectedWith(StorageError, RECORD_KEY_ERROR_MESSAGE);
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.read(COUNTRY, '123', requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.read(COUNTRY, '123', requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.read(COUNTRY, '123'))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.read(COUNTRY, '123', { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('encryption', () => {
        describe('when enabled', () => {
          TEST_RECORDS.forEach((testCase, idx) => {
            context(`with test case ${idx}`, () => {
              it('should read a record and decrypt it', async () => {
                const encryptedPayload = await encStorage.encryptPayload(testCase);
                nockPopApi(POPAPI_HOST).read(COUNTRY, encryptedPayload.record_key)
                  .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

                const { record } = await encStorage.read(COUNTRY, testCase.recordKey);
                expect(record).to.own.include(testCase);
                expect(record.createdAt).to.be.a('date');
                expect(record.updatedAt).to.be.a('date');
              });
            });
          });
        });

        describe('when disabled', () => {
          it('should read a record', async () => {
            const recordData = TEST_RECORDS[TEST_RECORDS.length - 1];
            const encryptedPayload = await noEncStorage.encryptPayload(recordData);
            expect(encryptedPayload.body).to.match(/^pt:.+/);
            nockPopApi(POPAPI_HOST).read(COUNTRY, encryptedPayload.record_key)
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await noEncStorage.read(COUNTRY, recordData.recordKey);
            expect(record).to.deep.include(recordData);
            expect(record.createdAt).to.be.a('date');
            expect(record.updatedAt).to.be.a('date');
          });
        });
      });

      describe('custom encryption', () => {
        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should read custom encrypted record', async () => {
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
              nockPopApi(POPAPI_HOST).read(COUNTRY, encryptedPayload.record_key)
                .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

              const { record } = await storage.read(COUNTRY, testCase.recordKey);
              expect(record).to.own.include(testCase);
            });
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          const popAPI = nockPopApi(POPAPI_HOST).read(COUNTRY, encryptedPayload.record_key)
            .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.read(COUNTRY, TEST_RECORDS[0].recordKey)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');

          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          nockPopApi(POPAPI_HOST).read(COUNTRY, encryptedPayload.record_key)
            .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload }, popapiResponseHeaders);

          await encStorage.read(COUNTRY, TEST_RECORDS[0].recordKey, { meta: callMeta });
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'read');
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });

            const popAPI = nockPopApi(POPAPI_HOST).read(COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            await storage.read(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });

          it('should return record with original keys', async () => {
            const storage = await getDefaultStorage(true, true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });
            nockPopApi(POPAPI_HOST).read(COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await storage.read(COUNTRY, recordKey);
            expect(record.recordKey).to.equal(recordKey);
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const encryptedPayload = await storage.encryptPayload({ recordKey });
            expect(encryptedPayload.record_key).to.equal(storage.createKeyHash(recordKey));

            const popAPI = nockPopApi(POPAPI_HOST).read(COUNTRY, storage.createKeyHash(recordKey))
              .reply(200, { ...EMPTY_API_RECORD, ...encryptedPayload });

            const { record } = await storage.read(COUNTRY, recordKey);

            expect(record.recordKey).to.equal(recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const recordKey = '123';
          const storage = await getDefaultStorage();
          const encryptedPayload = await storage.encryptPayload({ recordKey });
          const response = { ...EMPTY_API_RECORD, ...encryptedPayload };

          nockPopApi(POPAPI_HOST).read(country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('uS', recordKey);

          nockPopApi(POPAPI_HOST).read(country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('Us', recordKey);

          nockPopApi(POPAPI_HOST).read(country, storage.createKeyHash(recordKey))
            .reply(200, response);
          await storage.read('US', recordKey);
        });
      });
    });
  });
});
