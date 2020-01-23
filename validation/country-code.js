const COUNTRY_CODE_REGEXP = /^[a-z]{2}$/i;
const COUNTRY_CODE_ERROR_MESSAGE = 'Country code must be a string with two letter code';

function validateCountryCode(countryCode) {
  if (typeof countryCode !== 'string' || !countryCode.match(COUNTRY_CODE_REGEXP)) {
    return new Error(COUNTRY_CODE_ERROR_MESSAGE);
  }
  return countryCode;
}

module.exports = {
  validateCountryCode,
  COUNTRY_CODE_ERROR_MESSAGE,
};
