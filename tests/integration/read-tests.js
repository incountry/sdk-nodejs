/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');
const { StorageServerError } = require('../../lib/errors');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

let storage;
let data;

describe('Read data from Storage', function () {
  afterEach(async function () {
    await storage.delete(COUNTRY, data.key).catch(noop);
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      before(async function () {
        storage = await createStorage(encryption);
      });

      it('Read data', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Read not existing data', async function () {
        const key = Math.random().toString(36).substr(2, 10);

        const error = await expect(storage.read(COUNTRY, key))
          .to.be.rejectedWith(StorageServerError);

        expect(error.code).to.be.equal(404);
      });

      it('Read data with optional keys and range', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          profile_key: 'profileKey',
          range_key: 42341,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.body).to.equal(data.body);
        expect(record.key).to.equal(data.key);
        expect(record.key2).to.equal(data.key2);
        expect(record.key3).to.equal(data.key3);
        expect(record.profile_key).to.equal(data.profile_key);
        expect(record.range_key).to.equal(data.range_key);
      });

      it('Read data with null body', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
          body: null,
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(data.body);
      });

      it('Read data with empty body', async function () {
        data = {
          key: Math.random().toString(36).substr(2, 10),
        };

        await storage.write(COUNTRY, data);
        const { record } = await storage.read(COUNTRY, data.key);

        expect(record.key).to.equal(data.key);
        expect(record.body).to.equal(null);
      });
    });
  });
});
