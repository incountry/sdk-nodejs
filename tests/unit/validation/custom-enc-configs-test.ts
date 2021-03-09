import * as chai from 'chai';
import { CustomEncryptionConfigsIO } from '../../../src/validation/user-input/custom-encryption-configs';
import { isValid } from '../../../src/validation/utils';

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
  [
    { encrypt: () => {}, decrypt: () => {}, version: '0' },
    { encrypt: () => {}, decrypt: () => {}, version: '0' },
  ],
  [{
    encrypt: () => {}, decrypt: () => {}, version: '0', isCurrent: 0,
  }],
  [
    {
      encrypt: () => {}, decrypt: () => {}, version: '0', isCurrent: true,
    },
    {
      encrypt: () => {}, decrypt: () => {}, version: '1', isCurrent: true,
    },
  ],
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
