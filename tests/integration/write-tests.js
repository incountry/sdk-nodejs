/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const storageCommon = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const { createStorage } = storageCommon;
/** @type {import('../../storage')} */
let storage;

describe('Write data to Storage', function () {
  before(async function () {
    storage = createStorage(false);
  });

  it('C1911 Write data', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await expect(storage.readAsync({
      country: data.country,
      key: data.key,
    })).to.be.rejected;

    await storage.writeAsync(data);

    const { record } = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(record.key).to.equal(data.key);
    expect(record.body).to.equal(data.body);
  });

  it('C1915 Write data with optional keys and range value', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
      profile_key: 'profileKey',
      range_key: 42341,
      key2: 'optional key value 2',
      key3: 'optional key value 3',
    };

    await expect(storage.readAsync({
      country: data.country,
      key: data.key,
    })).to.be.rejected;

    await storage.writeAsync(data);

    const { record } = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(record.key).to.equal(data.key);
    expect(record.body).to.equal(data.body);
  });

  it('C1916 Write data with empty body', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: null,
    };

    await expect(storage.readAsync({
      country: data.country,
      key: data.key,
    })).to.be.rejected;

    await storage.writeAsync(data);

    const { record } = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(record.key).to.equal(data.key);
    expect(record.body).to.equal(data.body);
  });

  it('C1923 Rewrite data', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ firstName: 'MyFirstName' }),
    };

    await storage.writeAsync(data);

    const result1 = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(result1.record.key).to.equal(data.key);
    expect(result1.record.body).to.equal(data.body);

    data.body = JSON.stringify({ lastName: 'MyLastName' });

    await storage.writeAsync(data);

    const result2 = await storage.readAsync({
      country: data.country,
      key: data.key,
    });

    expect(result2.record.key).to.equal(data.key);
    expect(result2.record.body).to.equal(data.body);
  });

  describe('Encryption', function () {
    before(async function () {
      storage = createStorage(true);
    });

    it('C1918 Write encrypted data', async function () {
      const data = {
        country: 'US',
        key: `EncKey_${Math.random().toString(36).substr(2, 5)}`,
        body: JSON.stringify({ name: 'PersonName' }),
      };

      await storage.writeAsync(data);

      const { record } = await storage.readAsync({
        country: data.country,
        key: data.key,
      });

      expect(record.key).to.equal(data.key);
      expect(record.body).to.equal(data.body);
    });
  });
});
