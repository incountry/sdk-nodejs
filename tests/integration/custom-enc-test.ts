import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY } from './common';
import { Storage } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: { key: string; body: string };

describe('Custom encryption', () => {
  beforeEach(async () => {
  });

  afterEach(async () => {
    if (data && data.key) {
      await storage.delete(COUNTRY, data.key);
    }
  });

  it('should encrypt and decrypt data', async () => {
    const secrets = {
      secrets: [
        {
          secret: 'longAndStrongPassword',
          version: 1,
          isForCustomEncryption: true,
        },
      ],
      currentVersion: 1,
    };

    const customEncConfigs = [{
      encrypt: (text: string) => Promise.resolve(Buffer.from(text).toString('base64')),
      decrypt: (encryptedData: string) => Promise.resolve(Buffer.from(encryptedData, 'base64').toString('utf-8')),
      isCurrent: true,
      version: 'current',
    }];

    storage = await createStorage(true, false, () => secrets, customEncConfigs);

    data = {
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.write(COUNTRY, data);
    const { record } = await storage.read(COUNTRY, data.key);

    expect(record.key).to.equal(data.key);
    expect(record.body).to.equal(data.body);
  });
});