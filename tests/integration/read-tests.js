/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;


/** @type {import('../../storage')} */
let storage;
let data;

describe('Read data from Storage', function () {
  afterEach(async function () {
    await storage.deleteAsync({
      country: data.country,
      key: data.key,
    }).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);

    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      it('Read data', async function () {
        data = {
          country: 'US',
          key: Math.random().toString(36).substr(2, 10),
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

      it('Read not existing data', async function () {
        data = {
          country: 'US',
          key: Math.random().toString(36).substr(2, 10),
        };

        await expect(storage.readAsync(data))
          .to.be.rejectedWith(Error, 'Request failed with status code 404');
      });

      it('Read data with optional keys and range', async function () {
        data = {
          country: 'US',
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
          profile_key: 'profileKey',
          range_key: 42341,
          key2: 'optional key value 2',
          key3: 'optional key value 3',
        };

        await storage.writeAsync(data);

        const { record } = await storage.readAsync({
          country: data.country,
          key: data.key,
        });

        expect(record.body).to.equal(data.body);
        expect(record.key).to.equal(data.key);
        expect(record.key2).to.equal(data.key2);
        expect(record.key3).to.equal(data.key3);
        expect(record.profile_key).to.equal(data.profile_key);
        expect(record.range_key).to.equal(data.range_key);
      });

      it('Read data with empty body', async function () {
        data = {
          country: 'US',
          key: Math.random().toString(36).substr(2, 10),
          body: null,
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
});
