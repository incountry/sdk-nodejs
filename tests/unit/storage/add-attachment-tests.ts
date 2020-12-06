import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import {
  POPAPI_HOST,
  COUNTRY,
  REQUEST_TIMEOUT_ERROR,
  getDefaultStorage,
  EMPTY_API_ATTACHMENT_META,
} from './common';
import { StorageError, StorageServerError } from '../../../src/errors';
import { COUNTRY_CODE_ERROR_MESSAGE } from '../../../src/validation/country-code';
import { nockPopApi, getNockedRequestBodyRaw } from '../../test-helpers/popapi-nock';
import { Storage } from '../../../src/storage';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect, assert } = chai;

class ReadStreamMock extends ReadStream {
  open() {}
}

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


    describe('addAttachment', () => {
      describe('arguments validation', () => {
        describe('when country is not a string', () => {
          it('should throw an error', async () => {
            const wrongCountries = [undefined, null, 1, {}, []];
            // @ts-ignore
            await Promise.all(wrongCountries.map((country) => expect(encStorage.addAttachment(country))
              .to.be.rejectedWith(StorageError, COUNTRY_CODE_ERROR_MESSAGE)));
          });
        });
      });

      describe('in case of network error', () => {
        it('should throw an error', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const attachment = { file: Buffer.from(''), fileName: 'test' };

          nock.cleanAll();
          const scope = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key)
            .replyWithError(REQUEST_TIMEOUT_ERROR);

          await expect(encStorage.addAttachment(COUNTRY, recordKey, attachment)).to.be.rejectedWith(StorageServerError);
          assert.equal(scope.isDone(), true, 'Nock scope is done');
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          const country = 'us';
          const recordKey = '123';
          const attachment = { file: Buffer.from(''), fileName: 'test' };

          const storage = await getDefaultStorage();
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });

          nockPopApi(POPAPI_HOST).addAttachment(country, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.addAttachment('uS', recordKey, attachment);

          nockPopApi(POPAPI_HOST).addAttachment(country, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.addAttachment('Us', recordKey, attachment);

          nockPopApi(POPAPI_HOST).addAttachment(country, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);
          await storage.addAttachment('US', recordKey, attachment);
        });
      });

      describe('attachment data consumption', () => {
        let stub: sinon.SinonStub | undefined;
        afterEach(() => {
          if (stub) {
            stub.restore();
          }
        });

        it('should read file by path', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);

          const data = '1111111222222';
          const fileName = 'test123';

          const filePath = 'test/test';

          stub = sinon.stub(fs, 'createReadStream').callsFake(() => {
            const data$ = new Readable({
              objectMode: true,
              read() {},
            });
            data$.push(data);
            data$.push(null);
            return data$ as ReadStream;
          });

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = encStorage.addAttachment(COUNTRY, recordKey, { fileName, file: filePath });
          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(stub).calledWith(filePath);
          expect(bodyObj).to.include(data);
          expect(bodyObj).to.include(fileName);
        });

        it('should read data from buffer', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);

          const data = '1111111';
          const fileName = 'test';

          const file = Buffer.from(data);

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = encStorage.addAttachment(COUNTRY, recordKey, { fileName, file });
          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(data);
          expect(bodyObj).to.include(fileName);
        });

        it('should read data from stream', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);

          const chunks = ['1111111', '2222222', '3333333'];
          const fileName = 'test';

          const data$ = new Readable({
            objectMode: true,
            read() {},
          });

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = encStorage.addAttachment(COUNTRY, recordKey, { fileName, file: data$ });

          data$.push(chunks[0]);
          data$.push(chunks[1]);
          data$.push(chunks[2]);
          data$.push(null);

          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(chunks.join(''));
          expect(bodyObj).to.include(fileName);
        });

        it('should get file name from stream', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);

          const chunks = ['1111111', '2222222', '3333333'];
          const fileName = 'test.jpg';

          // @ts-ignore
          const data$ = new ReadStreamMock(`aaaa/bbb/${fileName}`);

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = encStorage.addAttachment(COUNTRY, recordKey, { file: data$ });

          data$.push(chunks[0]);
          data$.push(chunks[1]);
          data$.push(chunks[2]);
          data$.push(null);

          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(chunks.join(''));
          expect(bodyObj).to.include(fileName);
        });


        it('should send provided mime-type', async () => {
          const recordKey = '123';
          const encryptedPayload = await encStorage.encryptPayload({ recordKey });
          const popAPI = nockPopApi(POPAPI_HOST).addAttachment(COUNTRY, encryptedPayload.record_key).reply(200, EMPTY_API_ATTACHMENT_META);

          const data = '1111111';
          const fileName = 'test14';
          const mimeType = 'text/aaabbbccc';

          const file = Buffer.from(data);

          const bodyPromise = getNockedRequestBodyRaw(popAPI);
          const reqPromise = encStorage.addAttachment(COUNTRY, recordKey, { fileName, file, mimeType });
          const [bodyObj] = await Promise.all([bodyPromise, reqPromise]);

          assert.equal(popAPI.isDone(), true, 'Nock scope is done');
          expect(bodyObj).to.include(data);
          expect(bodyObj).to.include(`filename="${fileName}"`);
          expect(bodyObj).to.include(`Content-Type: ${mimeType}`);
        });
      });
    });
  });
});
