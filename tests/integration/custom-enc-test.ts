import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY, noop } from './common';
import { Storage } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let data: { recordKey: string; body: string };

describe('Custom encryption', () => {
  beforeEach(async () => {
  });

  afterEach(async () => {
    if (data && data.recordKey) {
      await storage.delete(COUNTRY, data.recordKey).catch(noop);
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
      recordKey: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.write(COUNTRY, data);
    const { record } = await storage.read(COUNTRY, data.recordKey);

    expect(record.recordKey).to.equal(data.recordKey);
    expect(record.body).to.equal(data.body);
  });
});
