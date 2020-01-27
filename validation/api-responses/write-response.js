const t = require('io-ts');
const { validateWithIO } = require('../utils');

const WriteResponseIO = t.brand(
  t.string,
  (v) => v === 'OK',
  'WriteResponseIO',
);

const validateWriteResponse = (responseData) => validateWithIO(responseData, WriteResponseIO);

module.exports = {
  WriteResponseIO,
  validateWriteResponse,
};
