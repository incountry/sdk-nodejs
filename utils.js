const t = require('io-ts');

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

module.exports = {
  toPromise,
  PositiveInt,
};
