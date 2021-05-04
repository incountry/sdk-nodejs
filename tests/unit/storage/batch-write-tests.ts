import * as chai from 'chai';
import * as sinon from 'sinon';
import nock from 'nock';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chaiDateTime from 'chai-datetime';
import { v4 as uuid } from 'uuid';
import * as _ from 'lodash';
import { Storage } from '../../../src/storage';
import {
  POPAPI_HOST,
  COUNTRY,
  popapiResponseHeaders,
  TEST_RECORDS,
  REQUEST_TIMEOUT_ERROR,
  getLoggerCallMeta,
  checkLoggerMeta,
  noop,
  EMPTY_API_RESPONSE_RECORD,
  getDefaultStorage,
  toApiRecord,
} from './common';
import { InputValidationError, StorageNetworkError } from '../../../src/errors';
import { nockPopApi, getNockedRequestBodyObject } from '../../test-helpers/popapi-nock';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/user-input/country-code';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { errorMessageRegExp } from '../../test-helpers/utils';
import { StorageRecord } from '../../../src/validation/storage-record';
import { STORAGE_RECORD_DATA_ARRAY_EMPTY_ERROR, MAX_RECORDS_IN_BATCH, STORAGE_RECORD_DATA_ARRAY_TOO_BIG_ERROR } from '../../../src/validation/user-input/storage-record-data-array';


chai.use(chaiAsPromised);
chai.use(chaiDateTime);
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

    describe('batchWrite', () => {
      let popAPI: nock.Scope;

      beforeEach(() => {
        popAPI = nockPopApi(POPAPI_HOST).batchWrite(COUNTRY).reply(200, [EMPTY_API_RESPONSE_RECORD], popapiResponseHeaders);
      });

      describe('arguments', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.batchWrite(country))
              .to.be.rejectedWith(InputValidationError, errorMessageRegExp('batchWrite() Validation Error:', COUNTRY_CODE_ERROR_MESSAGE))));
          });
        });

        describe('request options', () => {
          const recordsData = [{ recordKey: '123' }];
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.batchWrite(COUNTRY, recordsData, requestOptions))
              .to.be.rejectedWith(InputValidationError, 'batchWrite() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.batchWrite(COUNTRY, recordsData, requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.batchWrite(COUNTRY, recordsData))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.batchWrite(COUNTRY, recordsData, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('should validate records', () => {
        const errorCases = [{
          name: 'when the records has wrong type',
          arg: 'recordzzz',
          error: ['batchWrite() Validation Error:', '<RecordsArray> should be RecordsArray but got "recordzzz"'],
        },
        {
          name: 'when the records is empty array',
          arg: [],
          error: ['batchWrite() Validation Error:', STORAGE_RECORD_DATA_ARRAY_EMPTY_ERROR],
        },
        {
          name: 'when any record has no key field',
          arg: [{}],
          error: 'batchWrite() Validation Error: <RecordsArray>.0.recordKey should be string but got undefined',
        },
        {
          name: 'when any record from 4 has no key field',
          arg: [{ recordKey: '1' }, { recordKey: '1' }, { recordKey: '1' }, {}],
          error: 'batchWrite() Validation Error: <RecordsArray>.3.recordKey should be string but got undefined',
        },
        {
          name: `when records more than ${MAX_RECORDS_IN_BATCH}`,
          arg: Array(MAX_RECORDS_IN_BATCH + 1).fill(0),
          error: ['batchWrite() Validation Error:', STORAGE_RECORD_DATA_ARRAY_TOO_BIG_ERROR],
        },
        {
          name: 'when any record has wrong format',
          arg: [{ recordKey: '1', key2: 41234512 }],
          error: 'batchWrite() Validation Error: <RecordsArray>.0.key2 should be (string | null) but got 41234512',
        }];

        errorCases.forEach((errCase) => {
          it(`should throw an error ${errCase.name}`, async () => {
            // @ts-ignore
            await expect(encStorage.batchWrite(COUNTRY, errCase.arg))
              .to.be.rejectedWith(InputValidationError, errorMessageRegExp(...errCase.error));
          });
        });
      });

      describe('encryption', () => {
        const encryptionOptions = [{
          status: 'disabled',
          encrypted: false,
          testCaseName: 'encoded records',
        }, {
          status: 'enabled',
          encrypted: true,
          testCaseName: 'encrypted records',
        }];

        encryptionOptions.forEach((opt) => {
          describe(`when ${opt.status}`, () => {
            it(`should batch write ${opt.testCaseName}`, async () => {
              const storage = opt.encrypted ? encStorage : noEncStorage;
              const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
              const decryptedRecords = await Promise.all(bodyObj.records.map((encRecord: any) => storage.decryptPayload(toApiRecord({ ...EMPTY_API_RESPONSE_RECORD, ...encRecord }))));

              (decryptedRecords as StorageRecord[]).forEach((record, index) => {
                expect(record).to.include(_.omit(TEST_RECORDS[index], 'expiresAt'));
                const originalExpiresAt = TEST_RECORDS[index].expiresAt;
                if (originalExpiresAt) {
                  expect(record.expiresAt).to.be.a('date');
                  expect(record.expiresAt).to.equalDate(originalExpiresAt);
                }
              });
            });

            it('should set "is_encrypted"', async () => {
              const storage = opt.encrypted ? encStorage : noEncStorage;
              const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, TEST_RECORDS)]);
              bodyObj.records.forEach((r: any) => {
                expect(r.is_encrypted).to.equal(opt.encrypted);
              });
            });

            it('should parse "expiresAt" as ISO8601', async () => {
              const storage = opt.encrypted ? encStorage : noEncStorage;
              const testRecords = TEST_RECORDS.map((record) => ({
                ...record,
                expiresAt: record.expiresAt && record.expiresAt instanceof Date ? record.expiresAt.toISOString() : record.expiresAt,
              }));
              const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, testRecords)]);
              (bodyObj.records as any[]).forEach((r, index) => {
                const { expiresAt } = TEST_RECORDS[index];
                if (r.expires_at && expiresAt) {
                  expect(r.expires_at).to.equal(expiresAt.toISOString());
                }
              });
            });
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          nock.cleanAll();
          const scope = nockPopApi(POPAPI_HOST).batchWrite(COUNTRY)
            .replyWithError(REQUEST_TIMEOUT_ERROR);
          await expect(encStorage.batchWrite(COUNTRY, TEST_RECORDS))
            .to.be.rejectedWith(StorageNetworkError, `POST ${POPAPI_HOST}/v2/storage/records/${COUNTRY}/batchWrite ${REQUEST_TIMEOUT_ERROR.code}`);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('normalize keys option', () => {
        const key1 = 'aAbB';
        const key1Normalized = 'aabb';
        const key2 = 'cCdD';
        const key2Normalized = 'ccdd';

        describe('when enabled', () => {
          it('should normalize', async () => {
            const storage = await getDefaultStorage(true, true);
            const records = [{ recordKey: key1 }, { recordKey: key2 }];
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].record_key).to.equal(storage.createKeyHash(key1Normalized));
            expect(bodyObj.records[1].record_key).to.equal(storage.createKeyHash(key2Normalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize', async () => {
            const storage = await getDefaultStorage(true);
            const records = [{ recordKey: key1 }, { recordKey: key2 }];
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.batchWrite(COUNTRY, records)]);
            expect(bodyObj.records[0].record_key).to.equal(storage.createKeyHash(key1));
            expect(bodyObj.records[1].record_key).to.equal(storage.createKeyHash(key2));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockPopApi(POPAPI_HOST).batchWrite(country).reply(200, [EMPTY_API_RESPONSE_RECORD]);
          await storage.batchWrite('uS', [{ recordKey: '123' }]);

          nockPopApi(POPAPI_HOST).batchWrite(country).reply(200, [EMPTY_API_RESPONSE_RECORD]);
          await storage.batchWrite('Us', [{ recordKey: '123' }]);

          nockPopApi(POPAPI_HOST).batchWrite(country).reply(200, [EMPTY_API_RESPONSE_RECORD]);
          await storage.batchWrite('US', [{ recordKey: '123' }]);
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const recordsData = [{ recordKey: uuid() }, { recordKey: uuid() }];
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');
          await encStorage.batchWrite(COUNTRY, recordsData, { meta: callMeta }).catch(noop);
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'batchWrite');
        });
      });
    });
  });
});
