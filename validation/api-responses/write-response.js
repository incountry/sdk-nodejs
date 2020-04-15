const t = require('io-ts');

const WriteResponseIO = t.brand(
  t.string,
  (v) => v === 'OK',
  'WriteResponse',
);

module.exports = {
  WriteResponseIO,
};
