const t = require('io-ts');
const { RecordResponseIO } = require('./record-response');

const RecordsResponseIO = t.array(RecordResponseIO);

const FindResponseIO = t.type({
  meta: t.type({
    count: t.Int,
    limit: t.Int,
    offset: t.Int,
    total: t.Int,
  }),
  data: RecordsResponseIO,
}, 'FindResponse');

module.exports = {
  FindResponseIO,
};
