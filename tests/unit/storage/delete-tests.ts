import * as chai from 'chai';
import * as sinon from 'sinon';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { Storage } from '../../../src/storage';
import {
  COUNTRY,
  POPAPI_HOST,
  noop,
  TEST_RECORDS,
  sdkVersionRegExp,
  checkLoggerMeta,
  getLoggerCallMeta,
  popapiResponseHeaders,
  getDefaultStorage,
} from './common';
import { InputValidationError, StorageServerError } from '../../../src/errors';
import { nockPopApi, getNockedRequestHeaders } from '../../test-helpers/popapi-nock';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { RECORD_KEY_ERROR_MESSAGE } from '../../../src/validation/record-key';

chai.use(chaiAsPromised);
chai.use(sinonChai);
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

    describe('delete', () => {
      describe('arguments validation', () => {
        describe('country', () => {
          it('should throw an error when no country provided', async () => {
            // @ts-ignore
            await expect(encStorage.delete(undefined, ''))
              .to.be.rejectedWith(InputValidationError, `delete() Validation Error: ${COUNTRY_CODE_ERROR_MESSAGE}`);
          });
        });

        describe('recordKey', () => {
          it('should throw an error when no key provided', async () => {
            // @ts-ignore
            await expect(encStorage.delete(COUNTRY, undefined))
              .to.be.rejectedWith(InputValidationError, `delete() Validation Error: ${RECORD_KEY_ERROR_MESSAGE}`);
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.delete(COUNTRY, '123', requestOptions))
              .to.be.rejectedWith(InputValidationError, 'delete() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.delete(COUNTRY, '123', requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.delete(COUNTRY, '123'))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.delete(COUNTRY, '123', { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('encryption', () => {
        const key = 'test';

        it('should hash key regardless of enabled/disabled encryption', async () => {
          const encryptedKey = encStorage.createKeyHash(key);
          const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, encryptedKey)
            .times(2)
            .reply(200, { success: true });

          await encStorage.delete(COUNTRY, key);
          await noEncStorage.delete(COUNTRY, key);
          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        TEST_RECORDS.forEach((testCase, idx) => {
          context(`with test case ${idx}`, () => {
            it('should delete a record', async () => {
              const encryptedPayload = await encStorage.encryptPayload(testCase);
              const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, encryptedPayload.record_key).reply(200, { success: true });

              const result = await encStorage.delete(COUNTRY, testCase.recordKey);
              expect(result).to.deep.equal({ success: true });
              assert.equal(popAPI.isDone(), true, 'nock is done');
            });
          });
        });
      });

      describe('errors handling', () => {
        it('should throw an error when record not found', async () => {
          const key = 'invalid';
          const scope = nockPopApi(POPAPI_HOST).delete(COUNTRY, encStorage.createKeyHash(key)).reply(404);

          await expect(encStorage.delete(COUNTRY, key)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, encryptedPayload.record_key).reply(200, { success: true });

          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.delete(COUNTRY, TEST_RECORDS[0].recordKey)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');

          const encryptedPayload = await encStorage.encryptPayload(TEST_RECORDS[0]);
          nockPopApi(POPAPI_HOST).delete(COUNTRY, encryptedPayload.record_key)
            .reply(200, { success: true }, popapiResponseHeaders);

          await encStorage.delete(COUNTRY, TEST_RECORDS[0].recordKey, { meta: callMeta });
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'delete');
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, storage.createKeyHash(recordKeyNormalized))
              .reply(200, { success: true });

            await storage.delete(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using normalized key');
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const popAPI = nockPopApi(POPAPI_HOST).delete(COUNTRY, storage.createKeyHash(recordKey))
              .reply(200, { success: true });

            await storage.delete(COUNTRY, recordKey);
            assert.equal(popAPI.isDone(), true, 'Requested record using not normalized key');
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const record_key = '123';
          const storage = await getDefaultStorage();

          nockPopApi(POPAPI_HOST).delete(country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('uS', record_key);

          nockPopApi(POPAPI_HOST).delete(country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('Us', record_key);

          nockPopApi(POPAPI_HOST).delete(country, storage.createKeyHash(record_key)).reply(200, {});
          await storage.delete('US', record_key);
        });
      });
    });
  });
});
