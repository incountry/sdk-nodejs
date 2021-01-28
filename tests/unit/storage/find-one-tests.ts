import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import nock from 'nock';
import { Storage } from '../../../src/storage';
import {
  getDefaultStorage,
  COUNTRY,
  POPAPI_HOST,
  getDefaultFindResponse,
  TEST_RECORDS,
  EMPTY_API_RECORD,
  noop,
} from './common';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { INVALID_FIND_FILTER, VALID_FIND_FILTER } from '../validation/find-filter-test';
import { InputValidationError } from '../../../src/errors';
import { nockPopApi, getNockedRequestBodyObject } from '../../test-helpers/popapi-nock';


chai.use(chaiAsPromised);
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

    describe('findOne', () => {
      describe('arguments validation', () => {
        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.findOne(COUNTRY, {}, {}, requestOptions))
              .to.be.rejectedWith(InputValidationError, 'findOne() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.findOne(COUNTRY, {}, {}, requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.findOne(COUNTRY, {}, {}))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.findOne(COUNTRY, {}, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });

        describe('filter validation', () => {
          it('should throw an error when filter has wrong format', async () => Promise.all(
            // @ts-ignore
            INVALID_FIND_FILTER.map((filter) => expect(encStorage.findOne(COUNTRY, filter))
              .to.be.rejectedWith(InputValidationError, 'findOne() Validation Error: <FindFilter>', `wrong filter format: ${JSON.stringify(filter)}`)),
          ));

          it('should not throw an error when filter has correct format', async () => Promise.all(
            // @ts-ignore
            VALID_FIND_FILTER.map((filter) => expect(encStorage.findOne(COUNTRY, filter))
              .not.to.be.rejectedWith(InputValidationError)),
          ));

          it('should not throw an error when find filter is not provided', async () => {
            expect(encStorage.findOne(COUNTRY))
              .not.to.be.rejectedWith(InputValidationError);
          });
        });
      });

      it('should enforce limit:1', async () => {
        const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
          .reply(200, {
            meta: {
              count: 0, limit: 100, offset: 0, total: 0,
            },
            data: [],
          });

        const [bodyObj] = await Promise.all<any>([
          getNockedRequestBodyObject(popAPI),
          encStorage.findOne(COUNTRY, { recordKey: '' }, { limit: 100, offset: 0 }),
        ]);
        expect(bodyObj.options).to.deep.equal({ limit: 1, offset: 0 });
      });

      it('should return null when no results found', async () => {
        nockPopApi(POPAPI_HOST).find(COUNTRY).reply(200, getDefaultFindResponse());

        const result = await encStorage.findOne(COUNTRY, {});
        expect(result.record).to.equal(null);
      });

      [
        { status: 'enabled', getStorage: () => encStorage },
        { status: 'disabled', getStorage: () => noEncStorage },
      ].forEach(({ status, getStorage }) => {
        describe(`when encryption ${status}`, () => {
          it('should findOne by key10', async () => {
            const storage = getStorage();

            const filter = { key10: TEST_RECORDS[4].key10 as string };
            const resultRecords = TEST_RECORDS.filter((rec) => rec.key10 === filter.key10);


            const encryptedRecords = await Promise.all(resultRecords.map((record) => storage.encryptPayload(record)));
            const apiRecords = encryptedRecords.map((record) => ({
              ...EMPTY_API_RECORD,
              ...record,
              body: record.body || '',
            }));

            nockPopApi(POPAPI_HOST).find(COUNTRY)
              .reply(200, getDefaultFindResponse(apiRecords));
            const result = await storage.findOne(COUNTRY, filter);

            expect(result.record).to.own.include(TEST_RECORDS[4]);
          });
        });
      });
    });
  });
});
