const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

describe('Custom encryption', () => {
  it('should encrypt and decrypt data', async () => {
    const storage = await createStorage(true, COUNTRY);
    storage.setCustomEncryption([{
      encrypt: (text) => Buffer.from(text).toString('base64'),
      decrypt: (encryptedData) => Buffer.from(encryptedData, 'base64').toString('utf-8'),
      isCurrent: true,
      version: 'current',
    }]);

    const data = {
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.write(COUNTRY, data);
    const { record } = await storage.read(COUNTRY, data.key);

    expect(record.key).to.equal(data.key);
    expect(record.body).to.equal(data.body);
  });
});
