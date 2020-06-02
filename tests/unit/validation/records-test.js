const chai = require('chai');
const { StorageRecordsNEAIO } = require('../../../lib/validation/records');
const { isValid } = require('../../../lib/validation/utils');

const { expect } = chai;


const VALID = [
  [{ key: '' }],
  [{ key: '', version: 0 }],
  [{ key: '', body: '', version: 0 }],
  [{ key: '', body: null, version: 0 }],
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
  [{ key: '', version: '' }],
];

describe('Records Array validation', () => {
  const codec = StorageRecordsNEAIO;

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
