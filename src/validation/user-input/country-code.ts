import * as t from 'io-ts';

const COUNTRY_CODE_REGEXP = /^[a-z]{2}$/i;
const COUNTRY_CODE_ERROR_MESSAGE = 'Country code must be a string with two letter code';

type CountryCode = string;

const CountryCodeIO: t.Type<CountryCode> = new t.Type(
  'CountryCode',
  (u): u is CountryCode => t.string.is(u) && u.match(COUNTRY_CODE_REGEXP) !== null,
  (u, c) => {
    if (!t.string.is(u) || !u.match(COUNTRY_CODE_REGEXP)) {
      return t.failure(u, c, COUNTRY_CODE_ERROR_MESSAGE);
    }

    return t.success(u.toLowerCase());
  },
  String,
);

export {
  CountryCode,
  COUNTRY_CODE_ERROR_MESSAGE,
  CountryCodeIO,
};
