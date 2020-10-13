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
  {
    key1: 'k', key2: 'k', key3: 'k', key4: 'k', key5: 'k', key6: 'k', key7: 'k', key8: 'k', key9: 'k', key10: 'k',
  },
  { searchKeys: 'test' },
  { searchKeys: 'tes' },
  { searchKeys: 't'.repeat(256) },
  { searchKeys: "te$t 1234567±!@#$%^&*()_+[]{}|\\/.,<>-';" },
  { aa: 1, searchKeys: 'test' },
  { aa: { $not: 1 }, searchKeys: 'test' },
  { aa: { $not: 'aa' }, searchKeys: 'test' },
  { aa: { $not: [1] }, searchKeys: 'test' },
  { recordKey: 'test', searchKeys: 'test' },
  { serviceKey1: 'test', searchKeys: 'test' },
  { rangeKey1: 1, searchKeys: 'test' },
  { version: 1, searchKeys: 'test' },
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
  { searchKeys: ['test1', 'test2'] },
  { searchKeys: '' },
  { searchKeys: 't' },
  { searchKeys: 'tt' },
  { searchKeys: 't'.repeat(256 + 1) },
  { searchKeys: 1 },
  { searchKeys: { $gt: 1 } },
  { searchKeys: { $not: 'test' } },
  { aaa1: { cccccc: 1 }, searchKeys: 'test' },
  { aaa1: { $not: { $not: 1 } }, searchKeys: 'test' },
  { aaa3: { $gt: 'ccc' }, searchKeys: 'test' },
  { key1: 'k', searchKeys: 'test' },
  { key2: 'k', searchKeys: 'test' },
  { key3: 'k', searchKeys: 'test' },
  { key4: 'k', searchKeys: 'test' },
  { key5: 'k', searchKeys: 'test' },
  { key6: 'k', searchKeys: 'test' },
  { key7: 'k', searchKeys: 'test' },
  { key8: 'k', searchKeys: 'test' },
  { key9: 'k', searchKeys: 'test' },
  { key10: 'k', searchKeys: 'test' },
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
