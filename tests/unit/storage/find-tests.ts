import * as chai from 'chai';
import * as sinon from 'sinon';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import { Storage, InputValidationError } from '../../../src';
import {
  getDefaultStorage,
  COUNTRY, POPAPI_HOST,
  TEST_RECORDS,
  getLoggerCallMeta,
  checkLoggerMeta,
  popapiResponseHeaders,
  getDefaultFindResponse,
  EMPTY_API_RECORD,
  PORTAL_BACKEND_HOST,
  PORTAL_BACKEND_COUNTRIES_LIST_PATH,
  noop,
} from './common';
import { nockPopApi, getNockedRequestBodyObject } from '../../test-helpers/popapi-nock';
import { LIMIT_ERROR_MESSAGE_MAX, LIMIT_ERROR_MESSAGE_INT, MAX_LIMIT } from '../../../src/validation/limit';
import { filterFromStorageDataKeys } from '../../../src/validation/api/find-filter';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { Int } from '../../../src/validation/utils';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { INVALID_FIND_FILTER, VALID_FIND_FILTER } from '../validation/find-filter-test';

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

    describe('find', () => {
      describe('arguments validation', () => {
        describe('country validation', () => {
          it('should throw an error if country is not a string', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.find(country))
              .to.be.rejectedWith(InputValidationError, `find() Validation Error: ${COUNTRY_CODE_ERROR_MESSAGE}`)));
          });
        });

        describe('filter validation', () => {
          it('should throw an error when filter has wrong format', async () => Promise.all(
            // @ts-ignore
            INVALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .to.be.rejectedWith(InputValidationError, 'find() Validation Error: <FindFilter>', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when filter has correct format', async () => Promise.all(
            // @ts-ignore
            VALID_FIND_FILTER.map((filter) => expect(encStorage.find(COUNTRY, filter))
              .not.to.be.rejectedWith(InputValidationError)),
          ));

          it('should not throw an error when find filter is not provided', async () => {
            expect(encStorage.find(COUNTRY))
              .not.to.be.rejectedWith(InputValidationError);
          });
        });

        describe('options validation', () => {
          it('should throw an error when options.limit is not positive integer or greater than MAX_LIMIT', async () => {
            nock(PORTAL_BACKEND_HOST).get(PORTAL_BACKEND_COUNTRIES_LIST_PATH).reply(400);
            nockPopApi(POPAPI_HOST).find(COUNTRY).reply(200, getDefaultFindResponse());

            const nonPositiveLimits = [-123, 123.124, 'sdsd'];
            // @ts-ignore
            await Promise.all(nonPositiveLimits.map((limit) => expect(encStorage.find(COUNTRY, {}, { limit }))
              .to.be.rejectedWith(InputValidationError, `find() Validation Error: ${LIMIT_ERROR_MESSAGE_INT}`)));

            await expect(encStorage.find(COUNTRY, {}, { limit: MAX_LIMIT + 1 }))
              .to.be.rejectedWith(InputValidationError, `find() Validation Error: ${LIMIT_ERROR_MESSAGE_MAX}`);

            await expect(encStorage.find(COUNTRY, {}, { limit: 10 })).not.to.be.rejected;
          });

          it('should not throw an error when find options are not provided', async () => {
            expect(encStorage.find(COUNTRY, {}))
              .not.to.be.rejectedWith(InputValidationError);
          });
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.find(COUNTRY, {}, {}, requestOptions))
              .to.be.rejectedWith(InputValidationError, 'find() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.find(COUNTRY, {}, {}, requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.find(COUNTRY, {}, {}))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.find(COUNTRY, {}, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('encryption', () => {
        it('should hash filters regardless of enabled/disabled encryption', async () => {
          const filter = { recordKey: [uuid(), uuid()] };
          const hashedFilter = filterFromStorageDataKeys({ recordKey: filter.recordKey.map((el) => encStorage.createKeyHash(el)) });

          const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .times(2)
            .reply(200, getDefaultFindResponse());

          let [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), noEncStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        it('should hash filter with empty strings', async () => {
          const filter = { key2: { $not: '' } };
          const hashedFilter = { key2: { $not: encStorage.createKeyHash(filter.key2.$not) } };

          const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse());

          const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), encStorage.find(COUNTRY, filter)]);
          expect(bodyObj.filter).to.deep.equal(hashedFilter);

          assert.equal(popAPI.isDone(), true, 'nock is done');
        });

        type KEY =
          | 'recordKey'
          | 'key1'
          | 'key2'
          | 'key3'
          | 'key4'
          | 'key5'
          | 'key6'
          | 'key7'
          | 'key8'
          | 'key9'
          | 'key10'
          | 'key11'
          | 'key12'
          | 'key13'
          | 'key14'
          | 'key15'
          | 'key16'
          | 'key17'
          | 'key18'
          | 'key19'
          | 'key20'
          | 'serviceKey1'
          | 'serviceKey2'
          | 'parentKey'
          | 'profileKey';

        const keys: KEY[] = [
          'recordKey',
          'key1',
          'key2',
          'key3',
          'key4',
          'key5',
          'key6',
          'key7',
          'key8',
          'key9',
          'key10',
          'key11',
          'key12',
          'key13',
          'key14',
          'key15',
          'key16',
          'key17',
          'key18',
          'key19',
          'key20',
          'serviceKey1',
          'serviceKey2',
          'parentKey',
          'profileKey',
        ];

        keys.forEach((key) => {
          it(`should hash ${key} in filters request and decrypt returned data correctly`, async () => {
            const filter = { [key]: TEST_RECORDS[5][key] as string };
            const hashedFilter = { [key]: encStorage.createKeyHash(filter[key]) };
            let requestedFilter;

            const resultRecords = TEST_RECORDS.filter((rec) => rec[key] === filter[key]);
            const encryptedRecords = await Promise.all(resultRecords.map((record) => encStorage.encryptPayload(record)));
            const apiRecords = encryptedRecords.map((record) => ({
              ...EMPTY_API_RECORD,
              ...record,
              body: record.body || '',
              is_encrypted: true,
            }));

            nockPopApi(POPAPI_HOST).find(COUNTRY)
              .reply(200, (_uri, requestBody: any) => {
                requestedFilter = requestBody.filter;
                return getDefaultFindResponse(apiRecords);
              });

            const result = await encStorage.find(COUNTRY, filter, {});

            expect(result.records.map((record) => record.recordKey)).to.deep.equal(resultRecords.map((record) => record.recordKey));
            result.records.forEach((record) => {
              const resultRecord = resultRecords.find((resRecord) => resRecord.recordKey === record.recordKey);
              expect(record).to.include(resultRecord);
            });

            expect(requestedFilter).to.deep.equal(filterFromStorageDataKeys(hashedFilter));
          });
        });

        it('should decode not encrypted records correctly', async () => {
          const storedData = await Promise.all(TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)));
          const apiRecords = storedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse(apiRecords));

          const { records } = await noEncStorage.find(COUNTRY, { recordKey: 'key1' });

          records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
        });

        it('should not throw if some records cannot be decrypted', async () => {
          const encryptedData = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const apiRecords = encryptedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          const unsupportedData = {
            ...EMPTY_API_RECORD,
            country: 'us',
            record_key: 'somekey',
            body: '2:unsupported data',
            version: 0 as Int,
          };
          const data = [...apiRecords, unsupportedData];

          nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse(data));

          const result = await encStorage.find('us', {});

          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });

          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          if (result.errors === undefined) {
            throw assert.fail('FindResult should have errors array');
          }
          expect(result.errors[0].error.message).to.equal('Invalid IV length');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
        });

        it('find() in non-encrypted mode should not throw error if some records are encrypted', async () => {
          const nonEncryptedData = await Promise.all(
            TEST_RECORDS.map((record) => noEncStorage.encryptPayload(record)),
          );
          const apiRecords = nonEncryptedData.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));

          const unsupportedData = {
            ...EMPTY_API_RECORD,
            record_key: 'unsupported',
            body: '2:unsupported data',
          };

          const data = [...apiRecords, unsupportedData];

          nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse(data));

          const result = await noEncStorage.find('us', {});

          expect(result.meta).to.deep.equal({
            count: TEST_RECORDS.length + 1, total: TEST_RECORDS.length + 1, limit: 100, offset: 0,
          });
          result.records.forEach((record, index) => expect(record).to.own.include(TEST_RECORDS[index]));
          if (result.errors === undefined) {
            throw assert.fail('FindResult should have errors array');
          }
          expect(result.errors[0].error.message).to.equal('No secretKeyAccessor provided. Cannot decrypt encrypted data');
          expect(result.errors[0].rawData).to.deep.equal(unsupportedData);
        });
      });

      describe('normalize keys option', () => {
        const recordKey = 'aAbB';
        const recordKeyNormalized = 'aabb';

        let popAPI: nock.Scope;
        beforeEach(() => {
          popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, {
              meta: {
                count: 0, limit: 100, offset: 0, total: 0,
              },
              data: [],
            });
        });

        describe('when enabled', () => {
          it('should normalize filter object', async () => {
            const storage = await getDefaultStorage(true, true);
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { recordKey })]);
            expect(bodyObj.filter.record_key).to.equal(storage.createKeyHash(recordKeyNormalized));
          });
        });

        describe('when not enabled', () => {
          it('should not normalize filter object', async () => {
            const storage = await getDefaultStorage(true);
            const [bodyObj] = await Promise.all<any>([getNockedRequestBodyObject(popAPI), storage.find(COUNTRY, { recordKey })]);
            expect(bodyObj.filter.record_key).to.equal(storage.createKeyHash(recordKey));
          });
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';

          const storage = await getDefaultStorage();

          nockPopApi(POPAPI_HOST).find(country).reply(200, getDefaultFindResponse());
          await storage.find('uS', { recordKey: '123' });

          nockPopApi(POPAPI_HOST).find(country).reply(200, getDefaultFindResponse());
          await storage.find('Us', { recordKey: '123' });

          nockPopApi(POPAPI_HOST).find(country).reply(200, getDefaultFindResponse());
          await storage.find('US', { recordKey: '123' });
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');

          nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse(), popapiResponseHeaders);

          await encStorage.find(COUNTRY, { recordKey: uuid() }, undefined, { meta: callMeta });
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'find');
        });
      });
    });
  });
});
