import * as chai from 'chai';
import { RequestOptionsIO, RequestOptions } from '../../../src/validation/user-input/request-options';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;

const VALID_REQUEST_OPTIONS: RequestOptions[] = [
  {},
  { meta: {} },
  { meta: { a: 123 } },
  { headers: {} },
  { headers: { a: '' } },
  { headers: { a: '' }, meta: {} },
  { headers: { a: '' }, meta: { a: 123 } },
];

const INVALID_REQUEST_OPTIONS = [
  '',
  1,
  true,
  [],
  function a() {},
  null,
  { aaa: 11 },
  { headers: 11 },
  { meta: 111 },
];


describe('Request Options validation', () => {
  const codec = RequestOptionsIO;

  describe('.is()', () => {
    it('should return false for invalid data', () => {
      INVALID_REQUEST_OPTIONS.forEach((value) => {
        expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should return true for valid data', () => {
      VALID_REQUEST_OPTIONS.forEach((value) => {
        expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('.decode()', () => {
    it('should not decode invalid data', () => {
      INVALID_REQUEST_OPTIONS.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should decode valid data', () => {
      VALID_REQUEST_OPTIONS.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });
});

export {
  VALID_REQUEST_OPTIONS,
  INVALID_REQUEST_OPTIONS,
};
