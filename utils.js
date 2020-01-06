const t = require('io-ts');
const get = require('lodash.get');
const { ERROR_NAMES } = require('./constants');
const { PathReporter } = require('io-ts/lib/PathReporter');
const { StorageValidationError } = require('./errors');
const { StorageServerError } = require('./errors');

function validationToPromise(validation) {
  return new Promise((resolve, reject) => {
    if (validation._tag === 'Left') {
      const errorMessages = PathReporter.report(validation);
      reject(new StorageValidationError(validation, errorMessages[errorMessages.length - 1]));
    } else {
      resolve(validation.right);
    }
  });
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
  validationToPromise,
  PositiveInt,
  parsePoPError,
};
