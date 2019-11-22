const { expect } = require('chai');
const Storage = require('../../../storage');
const SecretKeyAccessor = require('../../../secret-key-accessor');

let storage;
let testBody;
let countryCode;
let keyValue;

describe('Delete data from Storage', () => {
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


  it('C1885 Delete data', async () => {
    const deleteResponse = await storage.deleteAsync({
      country: countryCode,
      key: keyValue,
    });

    // expect(deleteResponse).to.exist;
    expect(deleteResponse.status).to.equal(200);
  });


  it('C1886 Delete not existing data', async () => {
    const notExistingKey = 'NotExistingKey11';

    const deleteResponse = await storage.readAsync({
      country: countryCode,
      key: notExistingKey,
    });

    // expect(deleteResponse).to.exist;
    expect(deleteResponse.status).to.equal(404);
    expect(deleteResponse.error).to.equal(`Could not find a record for key: ${notExistingKey}`);
  });
});
