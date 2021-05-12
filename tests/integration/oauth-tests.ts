import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { v4 as uuid } from 'uuid';
import {
  createStorage, COUNTRY, noop,
} from './common';
import { createStorage as createStorageOrig, Storage } from '../../src';
import { StorageAuthenticationError } from '../../src/errors';
import * as defaultLogger from '../../src/logger';
import { Int } from '../../src/validation/utils';
import { StorageRecordData } from '../../src/validation/user-input/storage-record-data';
import { StorageOptions } from '../../src/validation/user-input/storage-options';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: StorageRecordData;
let dataList: StorageRecordData[];

const createRecord = (profileKey = 'profileKey') => ({
  recordKey: uuid(),
  body: JSON.stringify({ name: 'PersonName' }),
  profileKey,
  rangeKey10: 41 as Int,
  key10: 'optional key value 10',
  serviceKey2: 'optional service key value 2',
  serviceKey5: 'More integration test data',
});

describe('With OAuth authentication', () => {
  beforeEach(async () => {
    storage = await createStorage({
      encryption: true,
    });
    dataList = [];
  });

  afterEach(async () => {
    if (data) {
      await storage.delete(COUNTRY, data.recordKey).catch(noop);
      data = undefined as any;
    }
    if (dataList && dataList.length) {
      await Promise.all(dataList.map(async (item) => {
        await storage.delete(COUNTRY, item.recordKey).catch(noop);
      }));
      dataList = [];
    }
  });

  context('with wrong credentials', () => {
    let envIdOauth: any;
    let storage2: Storage;
    beforeEach(async () => {
      envIdOauth = process.env.INT_INC_ENVIRONMENT_ID_OAUTH;
      process.env.INT_INC_ENVIRONMENT_ID_OAUTH = uuid();
      storage2 = await createStorage({
        encryption: true,
      });
    });

    afterEach(() => {
      process.env.INT_INC_ENVIRONMENT_ID_OAUTH = envIdOauth;
    });

    it('should throw error on any storage operation', async () => {
      data = createRecord();

      const error = await expect(storage2.write(COUNTRY, data))
        .to.be.rejectedWith(
          StorageAuthenticationError,
          'Error during Storage.write() call: The requested scope is invalid, unknown, or malformed.',
        );
      expect(error.data).to.deep.include({
        error: 'invalid_scope',
        error_description: 'The requested scope is invalid, unknown, or malformed',
        status_code: 400,
      });
      data = undefined as any;
    });
  });

  describe('when OAuth token provided in options', () => {
    const createStorageWithOAuthToken = (token: string) => {
      const storageOptions: StorageOptions = {
        environmentId: process.env.INT_INC_ENVIRONMENT_ID_OAUTH,
        endpoint: process.env.INC_URL,
        encrypt: true,
        getSecrets: () => 'super!secret!',
        countriesEndpoint: process.env.INT_COUNTRIES_LIST_ENDPOINT,
        oauth: { token },
        logger: defaultLogger.withBaseLogLevel('warn'),
      };

      return createStorageOrig(storageOptions);
    };

    it('should write and read data', async () => {
      const host = process.env.INC_URL || '';
      const environmentId = process.env.INT_INC_ENVIRONMENT_ID_OAUTH || '';

      const token = await storage.authClient.getToken(host, environmentId, 'test');
      const storageWithOAuthToken = await createStorageWithOAuthToken(token);

      const token2 = await storageWithOAuthToken.authClient.getToken(host, environmentId, 'test');
      expect(token2).to.eq(token);

      const token3 = await storageWithOAuthToken.authClient.getToken(host, environmentId, 'test', true);
      expect(token3).to.eq(token);

      data = createRecord();

      await storageWithOAuthToken.write(COUNTRY, data);
      const { record } = await storageWithOAuthToken.read(COUNTRY, data.recordKey);

      expect(record).to.deep.include(data);
      expect(record.createdAt).to.be.a('date');
      expect(record.updatedAt).to.be.a('date');
    });
  });
});
