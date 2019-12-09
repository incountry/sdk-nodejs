/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const assert = require('assert');
const { AssertionError } = require('assert');
const storageCommon = require('./common');

const { createStorage } = storageCommon;
let storage;

describe('Delete data from Storage', function () {
  before(async function () {
    storage = createStorage(false);
  });

  it('C1885 Delete data', async function () {
    const data = {
      country: 'US',
      key: 'recordKey201',
      body: JSON.stringify({ name: 'PersonName' }),
    };
    const writeResponse = await storage.writeAsync(data);
    expect(writeResponse.data).to.equal('OK');

    const deleteResponse = await storage.deleteAsync({
      country: data.country,
      key: data.key,
    });

    expect(deleteResponse.status).to.equal(200);
  });


  it('C1886 Delete not existing data', async function () {
    try {
      await storage.deleteAsync({ country: 'US', key: 'NotExistingKey123' });
      assert.fail('expected exception not thrown');
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Request failed with status code 404');
    }
  });

  describe('Encryption', function () {
    before(async function () {
      storage = createStorage(true);
    });

    it('C1920 Delete encrypted data', async function () {
      const data = {
        country: 'US',
        key: 'recordEncKey0101',
        body: JSON.stringify({ LastName: 'MyEncLastName' }),
      };
      const writeResponse = await storage.writeAsync(data);
      expect(writeResponse.status).to.equal(201);

      const deleteResponse = await storage.deleteAsync({
        country: data.country,
        key: data.key,
      });

      expect(deleteResponse.status).to.equal(200);
    });
  });
});
