const t = require('io-ts');
const get = require('lodash.get');
const { ERROR_NAMES } = require('./constants');
const { StorageServerError } = require('./errors');

function toPromise(validation) {
  return new Promise((resolve, reject) => (
    validation._tag === 'Left'
      ? reject(validation.left)
      : resolve(validation.right)
  ));
}

const PositiveInt = t.brand(
  t.Int,
  (n) => n >= 0,
  'PositiveInt',
);

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

module.exports = {
  toPromise,
  PositiveInt,
  parsePoPError,
};
