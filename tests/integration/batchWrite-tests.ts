/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-arrow-callback,func-names */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Int } from 'io-ts';
import { createStorage, noop, COUNTRY } from './common';
import { Storage } from '../../src';
import { StorageRecordData } from '../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;
let dataList: StorageRecordData[];

describe('Batch write data to Storage', function () {
  afterEach(async function () {
    console.log('After each tests');
    console.log(`Delete data from ${COUNTRY} country`);
    for (const data of dataList) {
      await storage.delete(COUNTRY, data.recordKey).catch(noop);
    }
    console.log('Deleted records!');
  });

  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      beforeEach(async function () {
        storage = await createStorage({ encryption });
        dataList = [];
      });
      it('Batch write data', async function () {
        const data1 = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName1' }),
        };
        dataList.push(data1);

        const data2 = {
          recordKey: Math.random().toString(36).substr(2, 10),
          key1: Math.random().toString(36).substr(2, 10),
          key2: Math.random().toString(36).substr(2, 10),
          key3: Math.random().toString(36).substr(2, 10),
          profileKey: Math.random().toString(36).substr(2, 10),
          rangeKey1: Math.floor(Math.random() * 100) + 1 as Int,
          body: JSON.stringify({ name: 'PersonName2' }),
        };
        dataList.push(data2);

        const data3 = {
          recordKey: Math.random().toString(36).substr(2, 10),
          profileKey: Math.random().toString(36).substr(2, 10),
          key2: null,
          key3: null,
        };
        dataList.push(data3);

        const { records } = await storage.batchWrite(COUNTRY, [data1, data2, data3]);
        expect(records).to.eql(dataList);

        for (const data of dataList) {
          const { record } = await storage.read(COUNTRY, data.recordKey);
          expect(record.recordKey).to.equal(data.recordKey);

          if (data.key2 === undefined) {
            expect(record.key2).to.equal(null, 'key2');
          } else expect(record.key2).to.equal(data.key2, 'key2');

          if (data.key3 === undefined) {
            expect(record.key3).to.equal(null, 'key3');
          } else expect(record.key3).to.equal(data.key3, 'key3');

          if (data.profileKey === undefined) {
            expect(record.profileKey).to.equal(null, 'profileKey');
          } else expect(record.profileKey).to.equal(data.profileKey, 'profileKey');

          if (data.rangeKey1 === undefined) {
            expect(record.rangeKey1).to.equal(null, 'rangeKey1');
          } else expect(record.rangeKey1).to.equal(data.rangeKey1, 'rangeKey1');

          if (data.body === undefined) {
            expect(record.body).to.equal(null, 'body');
          } else expect(record.body).to.equal(data.body, 'body');
        }
      });
    });
  });
});
