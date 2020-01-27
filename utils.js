const get = require('lodash.get');
const { StorageServerError } = require('./errors');

const parsePoPError = (e) => {
  if (!(e instanceof StorageServerError)) {
    return {};
  }
  const errors = get(e, 'response.data.errors', []);
  const errorMessage = errors.map(({ title, source }) => `${title}: ${source}`).join(';\n');
  const requestHeaders = get(e, 'config.headers');
  const responseHeaders = get(e, 'response.headers');
  return { errorMessage, requestHeaders, responseHeaders };
};

const isPositiveInt = (number) => Number.isInteger(number) && number > 0;

module.exports = {
  isPositiveInt,
  parsePoPError,
};
