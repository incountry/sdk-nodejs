const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

let storage;
let data;

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
      encrypt: (text) => Buffer.from(text).toString('base64'),
      decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
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
