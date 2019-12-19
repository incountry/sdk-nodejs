const t = require('io-ts');
const get = require('lodash.get');
const { ERROR_NAMES } = require('./constants');

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
  if (e.name !== ERROR_NAMES.POP_ERROR) {
    return null;
  }
  try {
    const errors = get(e, 'response.data.errors');
    const stringifiedErrors = errors.map(({title, source}) => `${title}: ${source}`);
    return stringifiedErrors.join(';\n');
  } catch (e) {
    return null
  }
}

module.exports = {
  toPromise,
  PositiveInt,
  parsePoPError,
};
