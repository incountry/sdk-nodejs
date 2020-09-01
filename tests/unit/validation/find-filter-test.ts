import * as chai from 'chai';
import { FindFilterIO } from '../../../src/validation/api/find-filter';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;


const VALID_FIND_FILTER = [
  {},
  { aa: 1 },
  { aa: [] },
  { aa: [1] },
  { aa: { $not: 1 } },
  { aa: { $not: [1] } },
  { aa: { $gt: 1 } },
  { aa: { $lt: 1 } },
  { aa: '' },
  { aa: [''] },
];

const INVALID_FIND_FILTER = [
  false,
  '',
  1,
  [],
  () => 1,
  { aa: true },
  { aa: () => 1 },
  { aaa1: { $not: () => 1 } },
  { aaa1: { cccccc: 1 } },
  { aaa1: { $not: { $not: 1 } } },
  { aaa3: { $gt: 'ccc' } },
  { aaa3: { $gt: [] } },
];

describe('Find Filter validation', () => {
  const codec = FindFilterIO;


  describe('.is()', () => {
    it('should return false for invalid data', () => {
      INVALID_FIND_FILTER.forEach((value) => {
        expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should return true for valid data', () => {
      VALID_FIND_FILTER.forEach((value) => {
        expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('.decode()', () => {
    it('should not decode invalid data', () => {
      INVALID_FIND_FILTER.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should decode valid data', () => {
      VALID_FIND_FILTER.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });
});

export {
  VALID_FIND_FILTER,
  INVALID_FIND_FILTER,
};
