const { expect } = require('chai');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
let storage;

describe('Write data to Storage', () => {
  before(async () => {
    storage = createStorage(false);
  });

  it('C1911 Write data', async () => {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    const writeResponse = await storage.writeAsync(data);

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1915 Write data with optional keys and range value', async () => {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
      profile_key: 'profileKey',
      range_key: 42341,
      key2: 'optional key value 2',
      key3: 'optional key value 3',
    };

    const writeResponse = await storage.writeAsync(data);

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1916 Write data with empty body', async () => {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: null,
    };

    const writeResponse = await storage.writeAsync(data);

    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });

  it('C1923 Rewrite data', async () => {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ firstName: 'MyFirstName' }),
    };

    const writeResponse1 = await storage.writeAsync(data);

    expect(writeResponse1.status).to.equal(201);
    expect(writeResponse1.data).to.equal('OK');

    data.body = JSON.stringify({ lastName: 'MyLastName' });
    const writeResponse2 = await storage.writeAsync(data);

    expect(writeResponse2.status).to.equal(201);
    expect(writeResponse2.data).to.equal('OK');
  });

  describe.skip('Encryption', () => {
    before(async () => {
      storage = createStorage(true);
    });

    it('C1918 Write encrypted data', async () => {
      const data = {
        country: 'US',
        key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
        body: JSON.stringify({ name: 'PersonName' }),
      };
      const writeResponse = await storage.writeAsync(data);

      expect(writeResponse.status).to.equal(201);
      expect(writeResponse.data).to.equal('OK');
    });
  });
});
