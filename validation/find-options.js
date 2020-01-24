const t = require('io-ts');
const { validateWithIO, PositiveInt } = require('./utils');
const { LimitIO } = require('./limit');

const FindOptionsIO = t.partial({
  limit: LimitIO,
  offset: PositiveInt,
});

const validateFindOptions = (options) => validateWithIO(options, FindOptionsIO);

module.exports = {
  validateFindOptions,
};
