const t = require('io-ts');
const COUNTRY_CODE_REGEXP = /^[a-z]{2}$/i;
const COUNTRY_CODE_ERROR_MESSAGE = 'Country code must be a string with two letter code';

function validateCountryCode(countryCode) {
  if (typeof countryCode !== 'string' || !countryCode.match(COUNTRY_CODE_REGEXP)) {
    return new Error(COUNTRY_CODE_ERROR_MESSAGE);
  }
  return countryCode;
}

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
  validateCountryCode,
  CountryCodeIO,
  COUNTRY_CODE_ERROR_MESSAGE,
};
