import * as chai from 'chai';
import { CountriesCache } from '../../../src/countries-cache';
import { createStorage } from '../../../src/storage';
import { StorageError } from '../../../src/errors';

const { expect } = chai;

describe('Storage', () => {
  describe('interface methods', () => {
    describe('setCountriesCache', () => {
      it('should throw an error if not instance of CountriesCache was passed as argument', async () => {
        const storage = await createStorage({
          apiKey: 'apiKey',
          environmentId: 'envId',
          encrypt: false,
        });
        const wrongCountriesCaches = [null, undefined, false, {}];
        wrongCountriesCaches.forEach((item) => {
          // @ts-ignore
          expect(() => storage.setCountriesCache(item))
            .to.throw(StorageError, 'You must pass an instance of CountriesCache');
        });
        expect(() => storage.setCountriesCache(new CountriesCache())).not.to.throw();
      });
    });
  });
});
