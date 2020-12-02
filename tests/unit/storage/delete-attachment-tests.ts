import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import {
  POPAPI_HOST,
  COUNTRY,
  REQUEST_TIMEOUT_ERROR,
  getDefaultStorage,
} from './common';
import { InputValidationError, StorageServerError } from '../../../src/errors';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { nockPopApi } from '../../test-helpers/popapi-nock';
import { Storage } from '../../../src/storage';

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

    beforeEach(async () => {
      nock.disableNetConnect();
      encStorage = await getDefaultStorage(true);
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });


    describe('deleteAttachment', () => {
      describe('arguments validation', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.deleteAttachment(country))
              .to.be.rejectedWith(InputValidationError, `deleteAttachment() Validation Error: ${COUNTRY_CODE_ERROR_MESSAGE}`)));
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          const recordKey = '123';
          const fileId = 'abc1212232';
          const { record_key: hashedKey } = await encStorage.encryptPayload({ recordKey });

          nock.cleanAll();
          const scope = nockPopApi(POPAPI_HOST).deleteAttachment(COUNTRY, hashedKey, fileId)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(encStorage.deleteAttachment(COUNTRY, recordKey, fileId)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const recordKey = '123';
          const fileId = 'abc1212232';

          const storage = await getDefaultStorage();
          const { record_key: hashedKey } = await storage.encryptPayload({ recordKey });

          nockPopApi(POPAPI_HOST).deleteAttachment(country, hashedKey, fileId).reply(200, 'OK');
          await storage.deleteAttachment('uS', recordKey, fileId);

          nockPopApi(POPAPI_HOST).deleteAttachment(country, hashedKey, fileId).reply(200, 'OK');
          await storage.deleteAttachment('Us', recordKey, fileId);

          nockPopApi(POPAPI_HOST).deleteAttachment(country, hashedKey, fileId).reply(200, 'OK');
          await storage.deleteAttachment('US', recordKey, fileId);
        });
      });
    });
  });
});
