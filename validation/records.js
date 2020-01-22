const t = require('io-ts');
const { validateWithIO } = require('./utils');
const { RecordIO } = require('./record');

const RecordsIO = t.array(RecordIO);

const RecordsNEAIO = t.brand(
  RecordsIO,
  (records) => records.length > 0,
  'RecordsNotEmptyArrayIO',
);

const validateRecordsNEA = (records) => validateWithIO(records, RecordsNEAIO);

module.exports = {
  RecordsNEAIO,
  validateRecordsNEA,
};
