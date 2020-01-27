const t = require('io-ts');
const { RecordResponseIO } = require('./record-response');
const { validateWithIO } = require('../utils');

const RecordsResponseIO = t.array(RecordResponseIO);

const FindResponseIO = t.type({
  meta: t.type({
    count: t.Int,
    limit: t.Int,
    offset: t.Int,
    total: t.Int,
  }),
  data: RecordsResponseIO,
});

const validateFindResponse = (responseData) => validateWithIO(responseData, FindResponseIO);

module.exports = {
  FindResponseIO,
  validateFindResponse,
};
