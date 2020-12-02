import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import {
  POPAPI_HOST,
  COUNTRY,
  REQUEST_TIMEOUT_ERROR,
  getDefaultStorage,
  EMPTY_API_ATTACHMENT_META,
} from './common';
import { InputValidationError, StorageServerError } from '../../../src/errors';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { nockPopApi } from '../../test-helpers/popapi-nock';
import { Storage } from '../../../src/storage';
import { AttachmentWritableMeta } from '../../../src/validation/attachment-writable-meta';

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


    describe('updateAttachmentMeta', () => {
      describe('arguments validation', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.updateAttachmentMeta(country))
              .to.be.rejectedWith(InputValidationError, `updateAttachmentMeta() Validation Error: ${COUNTRY_CODE_ERROR_MESSAGE}`)));
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          const recordKey = '123';
          const fileId = 'abc1212232';
          const fileMeta: AttachmentWritableMeta = { fileName: 'newname' };

          const { record_key: hashedKey } = await encStorage.encryptPayload({ recordKey });

          nock.cleanAll();
          const scope = nockPopApi(POPAPI_HOST).updateAttachmentMeta(COUNTRY, hashedKey, fileId)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(encStorage.updateAttachmentMeta(COUNTRY, recordKey, fileId, fileMeta)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const recordKey = '123';
          const fileId = 'abc1212232';
          const fileMeta: AttachmentWritableMeta = { fileName: 'newname' };

          const storage = await getDefaultStorage();
          const { record_key: hashedKey } = await storage.encryptPayload({ recordKey });

          nockPopApi(POPAPI_HOST).updateAttachmentMeta(country, hashedKey, fileId).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.updateAttachmentMeta('uS', recordKey, fileId, fileMeta);

          nockPopApi(POPAPI_HOST).updateAttachmentMeta(country, hashedKey, fileId).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.updateAttachmentMeta('Us', recordKey, fileId, fileMeta);

          nockPopApi(POPAPI_HOST).updateAttachmentMeta(country, hashedKey, fileId).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.updateAttachmentMeta('US', recordKey, fileId, fileMeta);
        });
      });
    });
  });
});
