const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
let storage;

describe('Write data to Storage', () => {
  before(async () => {
    storage = createStorage(false);
  });


  it('C1911 Write data', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey0';
    const testBody = JSON.stringify({ name: 'PersonName' });

    const writeResponse = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1915 Write data with optional keys and range value', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey1';

    const profileKeyValue = 'profileKey';
    const rangeKeyValue = 42341;
    const key2Value = 'optional key value';
    const key3Value = 'optional kee 2 value';
    const testBody = JSON.stringify({ name: 'PersonName' });

    const writeResponse = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
      profile_key: profileKeyValue,
      range_key: rangeKeyValue,
      key2: key2Value,
      key3: key3Value,
    });

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1916 Write data with empty body', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey2';
    const testBody = null;

    const writeResponse = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1923 Rewrite data', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey3';

    let testBody = JSON.stringify({ firstName: 'MyFirstName' });
    const writeResponse1 = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    expect(writeResponse1.status).to.equal(201);
    expect(writeResponse1.data).to.equal('OK');

    testBody = JSON.stringify({ lastName: 'MyLastName' });
    const writeResponse2 = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    expect(writeResponse2.status).to.equal(201);
    expect(writeResponse2.data).to.equal('OK');
  });

  describe('Encryption', () => {
    before(async () => {
      storage = createStorage(true);
    });

    it('C1918 Write encrypted data', async () => {
      const countryCode = 'US';
      const keyValue = 'recordKey001';
      const testBody = JSON.stringify({ name: 'PersonName' });

      const writeResponse = await storage.writeAsync({
        country: countryCode,
        key: keyValue,
        body: testBody,
      });

      expect(writeResponse.status).to.equal(201);
      expect(writeResponse.data).to.equal('OK');
    });
  });
});


