import * as chai from 'chai';
import { SecretsDataIO } from '../../../src/validation/secrets-data';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;

const VALID = [
  { secrets: [{ secret: '', version: 0 }], currentVersion: 0 },
  { secrets: [{ secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', isKey: true, version: 0 }], currentVersion: 0 },
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
  { secrets: () => {} },
  { secrets: [] },
  { secrets: [{ secret: '' }] },
  { secrets: [{ secret: '', version: '' }] },
  { secrets: [], currentVersion: '' },
  { secrets: [{ secret: 'abc', isKey: true, version: 0 }], currentVersion: 0 },
  { secrets: [{ secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', isKey: true, version: 0 }], currentVersion: 0 },
  {
    secrets: [{
      secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', isKey: true, isForCustomEncryption: true, version: 0,
    },
    ],
    currentVersion: 0,
  },
];

describe('Secrets Data validation', () => {
  const codec = SecretsDataIO;

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
