/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

/** @type {import('../../storage')} */
let storage;

describe('Delete data from Storage', function () {
  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      // C1885 C1920
      it('Delete data', async function () {
        const data = {
          country: 'US',
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.writeAsync(data);

        await storage.readAsync({
          country: data.country,
          key: data.key,
        });

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

      // C1886
      it('Delete not existing data', async function () {
        await expect(storage.deleteAsync({ country: 'US', key: Math.random().toString(36).substr(2, 10) }))
          .to.be.rejectedWith(Error, 'Request failed with status code 404');
      });
    });
  });
});
