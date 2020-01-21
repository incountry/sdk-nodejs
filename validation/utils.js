const t = require('io-ts');
const { PathReporter } = require('io-ts/lib/PathReporter');
const { StorageValidationError } = require('../errors');

function isValid(validation) {
  return validation._tag === 'Right';
}

function createStorageValidationError(validation) {
  const errorMessages = PathReporter.report(validation);
  return new StorageValidationError(validation, errorMessages[errorMessages.length - 1]);
}

function tryValidate(validation) {
  if (!isValid(validation)) {
    throw createStorageValidationError(validation);
  }
  return validation.right;
}

function validationToPromise(validation) {
  return new Promise((resolve) => resolve(tryValidate(validation)));
}

const PositiveInt = t.brand(
  t.Int,
  (n) => n >= 0,
  'PositiveInt',
);

function nullable(type) {
  return t.union([type, t.null, t.undefined]);
}

module.exports = {
  validationToPromise,
  PositiveInt,
  nullable,
  tryValidate,
  isValid,
  createStorageValidationError,
};
