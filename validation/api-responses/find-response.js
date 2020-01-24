const t = require('io-ts');
const { RecordsIO } = require('../records');
const { validateWithIO } = require('../utils');

const FindResponseIO = t.type({
  meta: t.type({
    count: t.Int,
    limit: t.Int,
    offset: t.Int,
    total: t.Int,
  }),
  data: RecordsIO,
});

const validateFindResponse = (responseData) => validateWithIO(responseData, FindResponseIO);

module.exports = {
  FindResponseIO,
  validateFindResponse,
};
