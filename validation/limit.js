const { PositiveInt } = require('./utils');

const MAX_LIMIT = 100;
const LIMIT_ERROR_MESSAGE_INT = 'Limit should be a positive integer';
const LIMIT_ERROR_MESSAGE_MAX = `Max limit is ${MAX_LIMIT}. Use offset to populate more`;

function validateLimit(limit) {
  if (!PositiveInt.is(limit)) {
    return new Error(LIMIT_ERROR_MESSAGE_INT);
  }

  if (limit > MAX_LIMIT) {
    return new Error(LIMIT_ERROR_MESSAGE_MAX);
  }

  return limit;
}

module.exports = {
  MAX_LIMIT,
  validateLimit,
  LIMIT_ERROR_MESSAGE_INT,
  LIMIT_ERROR_MESSAGE_MAX,
};
