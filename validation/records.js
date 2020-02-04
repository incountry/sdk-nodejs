const t = require('io-ts');
const { validateWithIO } = require('./utils');
const { RecordIO } = require('./record');

const RecordsIO = t.array(RecordIO);

const RecordsNEAIO = new t.Type(
  'RecordsArray',
  (u) => RecordsIO.is(u) && u.length > 0,
  (u, c) => {
    if (!t.UnknownArray.is(u) || u.length === 0) {
      return t.failure(u, c, 'You must pass non-empty array of records');
    }

    return RecordsIO.validate(u, c);
  },
  Array,
);

const validateRecordsNEA = (records) => validateWithIO(records, RecordsNEAIO);

module.exports = {
  RecordsNEAIO,
  validateRecordsNEA,
};
