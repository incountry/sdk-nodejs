import * as chai from 'chai';
import { StorageRecordDataArrayIO } from '../../../src/validation/storage-record-data-array';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;

const VALID = [
  [{ recordKey: '1' }],
  [{ recordKey: '1', version: 0 }],
  [{ recordKey: '2', body: '', version: 0 }],
  [{ recordKey: '2', body: null, version: 0 }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: '',
  }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: null,
  }],
];

const INVALID = [
  true,
  false,
  () => {},
  '',
  -1,
  0,
  {},
  [],
  [{}],
  [{ key: 1 }],
  [{ key: '' }],
  [{ record_key: '' }],
  [{ record_key: 1 }],
  [{ record_key: '', body: 1 }],
];

describe('Records Array validation', () => {
  const codec = StorageRecordDataArrayIO;

  describe('.is()', () => {
    it('should return false for invalid data', () => {
      INVALID.forEach((value) => {
        expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should return true for valid data', () => {
      VALID.forEach((value) => {
        expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('.decode()', () => {
    it('should not decode invalid data', () => {
      INVALID.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should decode valid data', () => {
      VALID.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });
});
