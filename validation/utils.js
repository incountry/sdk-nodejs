const t = require('io-ts');
const { report } = require('./error-reporter');
const { StorageValidationError } = require('../errors');

function isValid(validation) {
  return validation._tag === 'Right';
}

function createStorageValidationError(validation) {
  const errorMessages = report(validation);
  return new StorageValidationError(validation, errorMessages.join('\n'));
}

function throwIfInvalid(validation) {
  if (!isValid(validation)) {
    throw createStorageValidationError(validation);
  }
  return validation.right;
}

function validationToPromise(validation) {
  return new Promise((resolve) => resolve(throwIfInvalid(validation)));
}

const PositiveInt = t.brand(
  t.Int,
  (n) => n >= 0,
  'PositiveInt',
);

function nullable(type) {
  return t.union([type, t.null, t.undefined]);
}

function validateWithIO(obj, io) {
  const validationResult = io.decode(obj);
  return isValid(validationResult) ? obj : createStorageValidationError(validationResult);
}

module.exports = {
  validationToPromise,
  PositiveInt,
  nullable,
  validateWithIO,
  isValid,
  createStorageValidationError,
};
