const t = require('io-ts');
const { validateWithIO, NonNegativeInt } = require('./utils');
const { LimitIO } = require('./limit');

const FindOptionsIO = t.partial({
  limit: LimitIO,
  offset: NonNegativeInt,
}, 'FindOptions');

const validateFindOptions = (options) => validateWithIO(options, FindOptionsIO);

module.exports = {
  validateFindOptions,
};
