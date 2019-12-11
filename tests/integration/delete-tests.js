/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const storageCommon = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;


const { createStorage } = storageCommon;
/** @type {import('../../storage')} */
let storage;

describe('Delete data from Storage', function () {
  before(async function () {
    storage = createStorage(false);
  });

  it('C1885 Delete data', async function () {
    const data = {
      country: 'US',
      key: Math.random().toString(36).substr(2, 10),
      body: JSON.stringify({ name: 'PersonName' }),
    };

    await storage.writeAsync(data);

    const deleteResult = await storage.deleteAsync({
      country: data.country,
      key: data.key,
    });

    expect(deleteResult.success).to.equal(true);

    await expect(storage.readAsync({
      country: data.country,
      key: data.key,
    })).to.be.rejected;
  });


  it('C1886 Delete not existing data', async function () {
    await expect(storage.deleteAsync({ country: 'US', key: 'NotExistingKey123' }))
      .to.be.rejectedWith(Error, 'Request failed with status code 404');
  });

  describe('Encryption', function () {
    before(async function () {
      storage = createStorage(true);
    });

    it('C1920 Delete encrypted data', async function () {
      const data = {
        country: 'US',
        key: Math.random().toString(36).substr(2, 10),
        body: JSON.stringify({ LastName: 'MyEncLastName' }),
      };

      await storage.writeAsync(data);

      const deleteResult = await storage.deleteAsync({
        country: data.country,
        key: data.key,
      });

      expect(deleteResult.success).to.equal(true);

      await expect(storage.readAsync({
        country: data.country,
        key: data.key,
      })).to.be.rejected;
    });
  });
});
