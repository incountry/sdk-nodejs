const chai = require('chai');
const { CustomEncryptionConfigsIO } = require('../../../lib/validation/custom-encryption-configs');
const { isValid } = require('../../../lib/validation/utils');

const { expect } = chai;


const VALID = [
  [{
    encrypt: () => {}, decrypt: () => {}, version: '0',
  }],
  [{
    encrypt: () => {}, decrypt: () => {}, version: '0', isCurrent: true,
  }],
];

const INVALID = [
  0,
  true,
  false,
  () => {},
  '',
  'abcd',
  [],
  [''],
  [{}],
  [{ encrypt: () => {} }],
  [{ decrypt: () => {}, version: 0 }],
  [{ encrypt: '', decrypt: '', version: 0 }],
  [{ encrypt: () => {}, decrypt: () => {}, version: 0 }],
  [{
    encrypt: () => {}, decrypt: () => {}, version: '0', isCurrent: 0,
  }],
];

describe('Custom Encryption Configs validation', () => {
  const codec = CustomEncryptionConfigsIO;

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
