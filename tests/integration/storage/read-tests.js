const { expect } = require('chai');
const Storage = require('../../../storage');
const SecretKeyAccessor = require('../../../secret-key-accessor');

let storage;
let testBody;
let countryCode;
let keyValue;

describe('Read data from Storage', () => {
  before(async () => {
    storage = new Storage(
      {
        tls: true,
        encrypt: false,
      },
      new SecretKeyAccessor((() => 'supersecret')),
    );
    countryCode = 'US';
    keyValue = 'recordKey0';

    testBody = JSON.stringify({ name: 'PersonName' });
    await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });
  });


  it('C1883 Read data', async () => {
    const readResponse = await storage.readAsync({
      country: countryCode,
      key: keyValue,
    });

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.body).to.equal(testBody);
    expect(readResponse.data.key).to.equal(keyValue);
  });


  it('C1884 Read not existing data', async () => {
    const notExistingKey = 'NotExistingKey11';

    const readResponse = await storage.readAsync({
      country: countryCode,
      key: notExistingKey,
    });

    expect(readResponse.status).to.equal(404);
    expect(readResponse.error).to.equal(`Could not find a record for key: ${notExistingKey}`);
  });
});
