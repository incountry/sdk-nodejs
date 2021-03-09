import * as chai from 'chai';
import { FindFilterIO, SEARCH_FIELD_MAX_LENGTH, FindFilter } from '../../../src/validation/user-input/find-filter';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;


const VALID_FIND_FILTER: FindFilter[] = [
  {},
  { rangeKey6: 1 },
  { rangeKey6: [] },
  { rangeKey6: [1] },
  { rangeKey6: { $not: 1 } },
  { rangeKey6: { $not: [1] } },
  { rangeKey6: { $gt: 1 } },
  { rangeKey6: { $lt: 1 } },
  { key2: '' },
  { key2: [''] },
  { key2: { $not: [''] } },
  {
    key1: 'k', key2: 'k', key3: 'k', key4: 'k', key5: 'k', key6: 'k', key7: 'k', key8: 'k', key9: 'k', key10: 'k', key11: 'k', key12: 'k', key13: 'k', key14: 'k', key15: 'k', key16: 'k', key17: 'k', key18: 'k', key19: 'k', key20: 'k',
  },
  { searchKeys: 'test' },
  { searchKeys: 'tes' },
  { searchKeys: 't'.repeat(SEARCH_FIELD_MAX_LENGTH) },
  { searchKeys: "te$t 1234567±!@#$%^&*()_+[]{}|\\/.,<>-';" },
  { rangeKey6: { $not: 1 }, searchKeys: 'test' },
  { profileKey: { $not: 'aa' }, searchKeys: 'test' },
  { rangeKey6: { $not: [1] }, searchKeys: 'test' },
  { recordKey: 'test', searchKeys: 'test' },
  { parentKey: 'test', searchKeys: 'test' },
  { serviceKey1: 'test', searchKeys: 'test' },
  { serviceKey5: 'test', searchKeys: 'test' },
  { rangeKey1: 1, searchKeys: 'test' },
  { version: 1, searchKeys: 'test' },
  { key1: null },
  { key1: { $not: null } },
  { rangeKey1: null },
  { rangeKey1: { $not: null } },
  { createdAt: new Date() },
  { updatedAt: new Date() },
  { expiresAt: new Date() },
  { expiresAt: [new Date()] },
  { expiresAt: { $not: [new Date()] } },
];

const INVALID_FIND_FILTER = [
  false,
  '',
  1,
  [],
  () => 1,
  { aa: 1 },
  { aa: [] },
  { aa: [1] },
  { aa: { $not: 1 } },
  { aa: { $not: [1] } },
  { aa: { $gt: 1 } },
  { aa: { $lt: 1 } },
  { aa: '' },
  { aa: [''] },
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
  { searchKeys: 't'.repeat(SEARCH_FIELD_MAX_LENGTH + 1) },
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
  { key11: 'k', searchKeys: 'test' },
  { key12: 'k', searchKeys: 'test' },
  { key13: 'k', searchKeys: 'test' },
  { key14: 'k', searchKeys: 'test' },
  { key15: 'k', searchKeys: 'test' },
  { key16: 'k', searchKeys: 'test' },
  { key17: 'k', searchKeys: 'test' },
  { key18: 'k', searchKeys: 'test' },
  { key19: 'k', searchKeys: 'test' },
  { key20: 'k', searchKeys: 'test' },
  { createdAt: '' },
  { updatedAt: 11111111 },
  { expiresAt: [111111111] },
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
