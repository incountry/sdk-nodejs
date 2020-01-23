const t = require('io-ts');
const { PositiveInt, validateWithIO } = require('./utils');

const MAX_LIMIT = 100;
const LIMIT_ERROR_MESSAGE_INT = 'Limit should be a positive integer';
const LIMIT_ERROR_MESSAGE_MAX = `Max limit is ${MAX_LIMIT}. Use offset to populate more`;

const LimitIO = new t.Type(
  'LimitIO',
  (u) => PositiveInt.is(u) && u <= MAX_LIMIT,
  (u, c) => {
    if (!PositiveInt.is(u)) {
      return t.failure(u, c, LIMIT_ERROR_MESSAGE_INT);
    }

    if (u > MAX_LIMIT) {
      return t.failure(u, c, LIMIT_ERROR_MESSAGE_MAX);
    }

    return t.success(u);
  },
  Number,
);

const validateLimit = (limit) => validateWithIO(limit, LimitIO);

module.exports = {
  MAX_LIMIT,
  validateLimit,
  LimitIO,
  LIMIT_ERROR_MESSAGE_INT,
  LIMIT_ERROR_MESSAGE_MAX,
};
