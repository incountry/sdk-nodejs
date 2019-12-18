const t = require('io-ts');
const { PathReporter } = require('io-ts/lib/PathReporter');
const { StorageValidationError } = require('./errors');

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

module.exports = {
  validationToPromise,
  PositiveInt,
};
