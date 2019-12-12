/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
let storage;

describe('Read data from Storage', function () {
  before(async function () {
    storage = createStorage(false);
  });

  it('C1883 Read data', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };
    const writeResponse = await storage.writeAsync(data);
    expect(writeResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.body).to.equal(data.body);
  });

  it('C1884 Read not existing data', async function () {
    const data = {
      country: 'US',
      key: 'NotExistingKey11',
    };
    const readResponse = await storage.readAsync(data);

    expect(readResponse.status).to.equal(404);
    expect(readResponse.error).to.equal(`Could not find a record for key: ${data.key}`);
  });

  it('C1922 Read data with optional keys and range', async function () {
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
    expect(writeResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.body).to.equal(data.body);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.key2).to.equal(data.key2);
    expect(readResponse.data.key3).to.equal(data.key3);
    expect(readResponse.data.profile_key).to.equal(data.profile_key);
    expect(readResponse.data.range_key).to.equal(data.range_key);
  });

  it('C1929 Read data with empty body', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: null,
    };
    const writeResponse = await storage.writeAsync(data);
    expect(writeResponse.data).to.equal('OK');

    const readResponse = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(readResponse.status).to.equal(200);
    expect(readResponse.data.key).to.equal(data.key);
    expect(readResponse.data.body).to.be.not.ok;
  });

  describe('Encryption', function () {
    before(async function () {
      storage = createStorage(true);
    });

    it('C1919 Read encrypted data', async function () {
      const data = {
        country: 'US',
        key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
        body: JSON.stringify({ LastName: 'MyEncLastName' }),
      };
      const writeResponse = await storage.writeAsync(data);
      expect(writeResponse.status).to.equal(201);

      const readResponse = await storage.readAsync({
        country: data.country,
        key: data.key,
      });

      expect(readResponse.status).to.equal(200);
      expect(readResponse.data.key).to.equal(data.key);
      expect(readResponse.data.body).to.equal(data.body);
    });
  });
});
