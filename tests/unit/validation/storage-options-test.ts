import * as chai from 'chai';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { OAuthEndpointsIO, OAuthEndpoints } from '../../../src/validation/storage-options';
import { isValid } from '../../../src/validation/utils';


const { expect } = chai;

const foldValidation = fold<unknown, OAuthEndpoints, OAuthEndpoints>(() => ({ default: '' }), identity);
const VALID = [
  { default: 'default' },
  { DeFaUlT: 'default' },
  { DEFAULT: 'default', APAC: 'APAC', south_pole: 'south_pole' },
  { default: 'default', apac: 'apac', emea: 'emea' },
];
const INVALID = [
  {},
  { default: 0 },
  { default: true },
  { default: () => {} },
  { default: [] },
  { default: {} },
  { key: '' },
];

describe('OAuth regions validation', () => {
  const codec = OAuthEndpointsIO;

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
    it('should decode valid data', () => {
      VALID.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });

    it('should lowercase keys', () => {
      expect(foldValidation(codec.decode({
        DeFaUlT: 'default',
        APAC: 'apac',
        EMEA: 'emea',
      }))).to.deep.equal({
        default: 'default',
        apac: 'apac',
        emea: 'emea',
      });

      expect(foldValidation(codec.decode({
        default: 'default',
        apac: 'apac',
        emea: 'emea',
      }))).to.deep.equal({
        default: 'default',
        apac: 'apac',
        emea: 'emea',
      });
    });

    it('should not decode invalid data', () => {
      INVALID.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });
  });
});
