/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

/** @type {import('../../storage')} */
let storage;
let data;

describe('Write data to Storage', function () {
  afterEach(async function () {
    await storage.delete(COUNTRY, data.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it('Write data', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Write data with optional keys and range value', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          profile_key: 'profileKey',
          range_key: 42341,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Write data with empty body', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await expect(storage.read(COUNTRY, data.key)).to.be.rejected;
        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Rewrite data', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ firstName: 'MyFirstName' }),
        };

        await storage.write(COUNTRY, data);
        const result1 = await storage.read(COUNTRY, data.key);

        expect(result1.record.key).to.equal(data.key);
        expect(result1.record.body).to.equal(data.body);

        data.body = JSON.stringify({ lastName: 'MyLastName' });

        await storage.write(COUNTRY, data);
        const result2 = await storage.read(COUNTRY, data.key);

        expect(result2.record.key).to.equal(data.key);
        expect(result2.record.body).to.equal(data.body);
      });
    });
  });
});
