const t = require('io-ts');
const { report } = require('./error-reporter');
const { StorageClientError } = require('../errors');

function isValid(validation) {
  return validation._tag === 'Right';
}

const toStorageClientError = (prefix = '') => (validation) => {
  const errorMessage = report(validation);
  return new StorageClientError(`${prefix}${errorMessage}`, validation);
}

function validationToPromise(validation, map) {
  return new Promise((resolve, reject) => isValid(validation) ? resolve(validation.right) : reject(map(validation)));
}

const PositiveInt = t.brand(
  t.Int,
  (n) => n > 0,
  'PositiveInt',
);

const NonNegativeInt = t.brand(
  t.Int,
  (n) => n >= 0,
  'NonNegativeInt',
);


function nullable(type) {
  return t.union([type, t.null]);
}

module.exports = {
  validationToPromise,
  toStorageClientError,
  PositiveInt,
  NonNegativeInt,
  nullable,
  isValid,
  getErrorMessage: report,
};
