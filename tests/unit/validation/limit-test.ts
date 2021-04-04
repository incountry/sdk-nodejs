import * as chai from 'chai';
import { LimitIO } from '../../../src/validation/user-input/limit';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;


const VALID = [1, 10, 100];
const INVALID = [true, false, () => {}, '', 'a', 'abcd', -1, 0, 101, 10000];

describe('Find Option: Limit validation', () => {
  const codec = LimitIO;


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
