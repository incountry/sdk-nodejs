import * as chai from 'chai';
import { FindOptionsIO } from '../../../src/validation/user-input/find-options';
import { isValid } from '../../../src/validation/utils';
import { findOptionsFromStorageDataKeys } from '../../../src/validation/api/api-find-options';

const { expect } = chai;


const VALID_FIND_OPTIONS = [
  {},
  { aa: 1 },
  { aa: [] },
  { limit: 1 },
  { offset: 1 },
  { sort: [{ rangeKey2: 'asc' }] },
  { sort: [{ rangeKey2: 'asc' }, { rangeKey3: 'asc' }] },
];

const INVALID_FIND_OPTIONS = [
  false,
  '',
  1,
  [],
  () => 1,
  { limit: -1 },
  { offset: -1 },
  { sort: 1 },
  { sort: [] },
  { sort: [{}] },
  { sort: [{ a: 1 }] },
  { sort: [{ rangeKey2: 1 }] },
  { sort: [{ rangeKey2: 'asc', rangeKey3: 'asc' }] },
];

describe('Find Options validation', () => {
  const codec = FindOptionsIO;


  describe('.is()', () => {
    it('should return false for invalid data', () => {
      INVALID_FIND_OPTIONS.forEach((value) => {
        expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should return true for valid data', () => {
      VALID_FIND_OPTIONS.forEach((value) => {
        expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('.decode()', () => {
    it('should not decode invalid data', () => {
      INVALID_FIND_OPTIONS.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should decode valid data', () => {
      VALID_FIND_OPTIONS.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('findOptionsFromStorageDataKeys', () => {
    it('should convert keys in .sort from StorageData to API', () => {
      expect(findOptionsFromStorageDataKeys({ sort: [{ rangeKey1: 'asc' }] })).to.deep.equal({ sort: [{ range_key1: 'asc' }] });
      expect(findOptionsFromStorageDataKeys({ sort: [{ createdAt: 'asc' }] })).to.deep.equal({ sort: [{ created_at: 'asc' }] });
    });
  });
});


export {
  VALID_FIND_OPTIONS,
  INVALID_FIND_OPTIONS,
};
