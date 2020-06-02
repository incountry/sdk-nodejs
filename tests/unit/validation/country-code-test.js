const chai = require('chai');
const { CountryCodeIO } = require('../../../lib/validation/country-code');
const { isValid } = require('../../../lib/validation/utils');

const { expect } = chai;


const VALID = ['us', 'ca', 'US', 'CA', 'uS'];
const INVALID = [0, true, false, () => {}, '', 'a', 'abcd'];

describe('Country Code validation', () => {
  const codec = CountryCodeIO;

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

    it('should lowercase input data', () => {
      expect(codec.decode('US').right).to.equal('us');
      expect(codec.decode('CA').right).to.equal('ca');
    });

    it('should not decode invalid data', () => {
      INVALID.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });
  });
});
