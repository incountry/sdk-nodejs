/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

/** @type {import('../../storage')} */
let storage;
let data;

describe('Write data to Storage', function () {
  afterEach(async function () {
    await storage.deleteAsync({
      country: data.country,
      key: data.key,
    }).catch(noop);
  });

  [false, true].forEach((encryption) => {
    storage = createStorage(encryption);
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      // C1911 C1918
      it('Write data', async function () {
        data = {
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

      // C1915
      it('Write data with optional keys and range value', async function () {
        data = {
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

      // C1916
      it('Write data with empty body', async function () {
        data = {
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

      // C1923
      it('Rewrite data', async function () {
        data = {
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
    });
  });
});
