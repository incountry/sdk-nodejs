const t = require('io-ts');
const { NonNegativeInt } = require('./utils');
const { LimitIO } = require('./limit');

const FindOptionsIO = t.partial({
  limit: LimitIO,
  offset: NonNegativeInt,
}, 'FindOptions');

module.exports = {
  FindOptionsIO,
};
