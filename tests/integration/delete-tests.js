/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

/** @type {import('../../storage')} */
let storage;

describe('Delete data from Storage', function () {
  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it('Delete data', async function () {
        const data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.writeAsync(COUNTRY, data);
        await storage.readAsync(COUNTRY, data.key);

        const deleteResult = await storage.deleteAsync(COUNTRY, data.key);
        expect(deleteResult.success).to.equal(true);

        await expect(storage.readAsync(COUNTRY, data.key)).to.be.rejected;
      });

      it('Delete not existing data', async function () {
        const key = Math.random().toString(36).substr(2, 10);
        await expect(storage.deleteAsync(COUNTRY, key))
          .to.be.rejectedWith(Error, 'Request failed with status code 404');
      });
    });
  });
});
