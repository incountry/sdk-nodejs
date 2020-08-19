/* eslint-disable prefer-arrow-callback,func-names */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY } from './common';
import { StorageServerError } from '../../src/errors';
import { Storage } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Delete data from Storage', function () {
  [false, true].forEach((encryption) => {
    context(`${encryption ? 'with' : 'without'} encryption`, function () {
      let storage: Storage;

      before(async function () {
        storage = await createStorage(encryption);
      });

      it('Delete data', async function () {
        const data = {
          recordKey: Math.random().toString(36).substr(2, 10),
          body: JSON.stringify({ name: 'PersonName' }),
        };

        await storage.write(COUNTRY, data);
        await storage.read(COUNTRY, data.recordKey);

        const deleteResult = await storage.delete(COUNTRY, data.recordKey);
        expect(deleteResult.success).to.equal(true);

        const error = await expect(storage.read(COUNTRY, data.recordKey))
          .to.be.rejectedWith(StorageServerError);

        expect(error.code).to.be.equal(404);
      });

      it('Delete not existing data', async function () {
        const key = Math.random().toString(36).substr(2, 10);

        const error = await expect(storage.delete(COUNTRY, key))
          .to.be.rejectedWith(StorageServerError);

        expect(error.code).to.be.equal(404);
      });
    });
  });
});
