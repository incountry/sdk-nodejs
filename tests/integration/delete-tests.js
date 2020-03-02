/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

describe('Delete data from Storage', function () {
  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      let storage;

      before(async function () {
        storage = await createStorage(encryption);
      });

      it('Delete data', async function () {
        const data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.write(COUNTRY, data);
        await storage.read(COUNTRY, data.key);

        const deleteResult = await storage.delete(COUNTRY, data.key);
        expect(deleteResult.success).to.equal(true);

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
      });

      it('Delete not existing data', async function () {
        const key = Math.random().toString(36).substr(2, 10);
        await expect(storage.delete(COUNTRY, key))
          .to.be.rejectedWith(Error, 'Request failed with status code 404');
      });
    });
  });
});
