/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { createStorage, noop } = require('./common');

chai.use(chaiAsPromised);
const { expect } = chai;

const COUNTRY = process.env.INT_INC_COUNTRY;

/** @type {import('../../storage')} */
let storage;
let dataList;


describe('Batch write data to Storage', function () {
  afterEach(async function () {
    console.log('After each tests');
    console.log(`Delete data from ${COUNTRY} country`);
    for (const data of dataList) {
      await storage.delete(COUNTRY, data.key).catch(noop);
    }
    console.log('Deleted records!');
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      beforeEach(async function () {
        storage = await createStorage(encryption);
        dataList = [];
      });
      it('Batch write data', async function () {
        const data1 = {
          key: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName1' }),
        };
        dataList.push(data1);

        const data2 = {
          key: Math.random().toString(36).substr(2, 10),
          key2: Math.random().toString(36).substr(2, 10),
          key3: Math.random().toString(36).substr(2, 10),
          profile_key: Math.random().toString(36).substr(2, 10),
          range_key: Math.floor(Math.random() * 100) + 1,
          body: JSON.stringify({ name: 'PersonName2' }),
        };
        dataList.push(data2);

        const data3 = {
          key: Math.random().toString(36).substr(2, 10),
          profile_key: Math.random().toString(36).substr(2, 10),
          // key2: null,
          // key3: null,
        };
        dataList.push(data3);

        const { records } = await storage.batchWrite(COUNTRY, [data1, data2, data3]);
        expect(records).to.eql(dataList);

        for (const data of dataList) {
          const { record } = await storage.read(COUNTRY, data.key);

          expect(record.key).to.equal(data.key);
          if (data.key2 === undefined) {
            expect(record.key2).to.equal(null, 'key2');
          } else expect(record.key2).to.equal(data.key2, 'key2');

          if (data.key3 === undefined) {
            expect(record.key3).to.equal(null, 'key3');
          } else expect(record.key3).to.equal(data.key3, 'key3');

          if (data.profile_key === undefined) {
            expect(record.profile_key).to.equal(null, 'profile_key');
          } else expect(record.profile_key).to.equal(data.profile_key, 'profile_key');

          if (data.range_key === undefined) {
            expect(record.range_key).to.equal(null, 'range_key');
          } else expect(record.range_key).to.equal(data.range_key, 'range_key');

          if (data.body === undefined) {
            expect(record.body).to.equal(null, 'body');
          } else expect(record.body).to.equal(data.body, 'body');
        }
      });
    });
  });
});
