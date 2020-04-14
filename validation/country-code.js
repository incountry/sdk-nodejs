const t = require('io-ts');

const COUNTRY_CODE_REGEXP = /^[a-z]{2}$/i;
const COUNTRY_CODE_ERROR_MESSAGE = 'Country code must be a string with two letter code';

const CountryCodeIO = new t.Type(
  'CountryCode',
  (u) => t.string.is(u) && u.match(COUNTRY_CODE_REGEXP),
  (u, c) => {
    if (!t.string.is(u) || !u.match(COUNTRY_CODE_REGEXP)) {
      return t.failure(u, c, COUNTRY_CODE_ERROR_MESSAGE);
    }

    return t.success(u);
  },
  String,
);


module.exports = {
  CountryCodeIO,
  COUNTRY_CODE_ERROR_MESSAGE,
};
