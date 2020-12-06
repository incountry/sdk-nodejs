import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { Storage, MigrateResult, FIND_LIMIT } from '../../../src/storage';
import {
  COUNTRY,
  TEST_RECORDS,
  EMPTY_API_RECORD,
  POPAPI_HOST,
  getDefaultFindResponse,
  noop,
  SECRET_KEY,
  getDefaultStorage,
} from './common';
import { StorageError } from '../../../src/errors';
import { nockPopApi, getNockedRequestBodyObject } from '../../test-helpers/popapi-nock';
import { ApiRecord } from '../../../src/validation/api/api-record';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';


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

    describe('migrate', () => {
      describe('when encryption disabled', () => {
        it('should throw an error', async () => {
          await expect(noEncStorage.migrate(COUNTRY, 10)).to.be.rejectedWith(StorageError, 'Migration not supported when encryption is off');
        });
      });

      describe('when encryption enabled', () => {
        it('should migrate data from old secret to new', async () => {
          const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
          const apiRecords = encryptedRecords.map((record) => ({
            ...EMPTY_API_RECORD,
            ...record,
            body: record.body || '',
          }));
          const migrateResult = { meta: { migrated: apiRecords.length, totalLeft: 0 } };

          const oldSecret = { secret: SECRET_KEY, version: 0 };
          const newSecret = { secret: 'newnew', version: 1 };

          const encStorage2 = await getDefaultStorage(true, false, () => ({
            secrets: [oldSecret, newSecret],
            currentVersion: newSecret.version,
          }));

          const popAPIFind = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse(apiRecords));
          const popAPIBatchWrite = nockPopApi(POPAPI_HOST).batchWrite(COUNTRY).reply(200, 'OK');

          const [findBodyObj, , result] = await Promise.all<any, any, MigrateResult>([
            getNockedRequestBodyObject(popAPIFind),
            getNockedRequestBodyObject(popAPIBatchWrite),
            encStorage2.migrate(COUNTRY, apiRecords.length),
          ]);

          expect(findBodyObj.filter.version).to.deep.equal({ $not: newSecret.version });
          expect(result).to.deep.equal(migrateResult);
          assert.equal(popAPIFind.isDone(), true, 'find() called');
          assert.equal(popAPIBatchWrite.isDone(), true, 'batchWrite() called');
        });
      });

      it('should not throw error if no records found to migrate', async () => {
        const apiRecords: ApiRecord[] = [];

        const oldSecret = { secret: SECRET_KEY, version: 1 };
        const newSecret = { secret: 'keykey', version: 2 };

        const encStorage2 = await getDefaultStorage(true, false, () => ({
          secrets: [oldSecret, newSecret],
          currentVersion: newSecret.version,
        }));

        const response = getDefaultFindResponse(apiRecords);
        nockPopApi(POPAPI_HOST).find(COUNTRY)
          .reply(200, response);

        await expect(encStorage2.migrate(COUNTRY, 10))
          .to.be.not.rejectedWith(StorageError);
      });

      it('should not throw error if cannot decrypt some record', async () => {
        const encryptedRecords = await Promise.all(TEST_RECORDS.map((record) => encStorage.encryptPayload(record)));
        const apiRecords = encryptedRecords.map((record) => ({
          ...EMPTY_API_RECORD,
          ...record,
          body: record.body || '',
        }));

        apiRecords[0].body = '1234578';

        const oldSecret = { secret: SECRET_KEY, version: 0 };
        const newSecret = { secret: 'keykey', version: 2 };

        const encStorage2 = await getDefaultStorage(true, false, () => ({
          secrets: [oldSecret, newSecret],
          currentVersion: newSecret.version,
        }));

        const response = getDefaultFindResponse(apiRecords);
        nockPopApi(POPAPI_HOST).find(COUNTRY)
          .reply(200, response);

        nockPopApi(POPAPI_HOST).batchWrite(COUNTRY).reply(200, 'OK');

        const result = await encStorage2.migrate(COUNTRY, apiRecords.length);
        expect(result.meta.errors).to.have.length(1);
        expect(result.meta.errors).to.have.deep.nested.property('[0].rawData', apiRecords[0]);
      });

      describe('arguments', () => {
        it('should use default limit if nothing has been passed', async () => {
          const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse());

          const bodyObjPromise = getNockedRequestBodyObject(popAPI);
          encStorage.migrate(COUNTRY).catch(noop);

          const bodyObj: any = await bodyObjPromise;
          expect(bodyObj.options.limit).to.equal(FIND_LIMIT);
        });

        it('should use passed limit', async () => {
          const limit = 3;
          const popAPI = nockPopApi(POPAPI_HOST).find(COUNTRY)
            .reply(200, getDefaultFindResponse());

          const bodyObjPromise = getNockedRequestBodyObject(popAPI);
          encStorage.migrate(COUNTRY, limit).catch(noop);
          const bodyObj: any = await bodyObjPromise;
          expect(bodyObj.options.limit).to.equal(limit);
        });

        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.migrate(COUNTRY, 1, {}, requestOptions))
              .to.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.migrate(COUNTRY, 1, {}, requestOptions))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>')));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.migrate(COUNTRY, 1, {}))
              .to.not.be.rejectedWith(StorageError, '<RequestOptionsIO>');
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.migrate(COUNTRY, 1, {}, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });
    });
  });
});
