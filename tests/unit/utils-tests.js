/* eslint-disable prefer-arrow-callback,func-names */
const chai = require('chai');
const {
  isJSON,
  omitNulls,
} = require('../../lib/utils');

const { expect } = chai;

describe('Utils', () => {
  describe('isJSON', () => {
    it('should return true if argument is valid JSON string', () => {
      expect(isJSON('{"a": 1}')).to.equal(true);
    });

    it('should return false if argument is not valid JSON string', () => {
      expect(isJSON('{"')).to.equal(false);
    });
  });

  describe('omitNulls', () => {
    it('should remove properties with value "null" from object', () => {
      expect(omitNulls({
        a: 0,
        b: '',
        c: undefined,
        d: null,
        e: false,
      })).to.deep.equal({
        a: 0,
        b: '',
        c: undefined,
        e: false,
      });
    });
  });
});
