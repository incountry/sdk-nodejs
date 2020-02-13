const t = require('io-ts');
const { validateWithIO } = require('./utils');

/**
 * @typedef {Object} CustomEncryption
 * @property {function} encrypt
 * @property {function} decrypt
 * @property {string} version
 * @property {boolean} [isCurrent]
 */

function hasCurrentCustomEncryption(ced) {
  return ced.filter((item) => item.isCurrent === true).length === 1;
}

const CustomEncryptionDataIO = t.brand(
  t.array(
    t.union([
      t.type({
        encrypt: t.Function,
        decrypt: t.Function,
        version: t.string,
      }),
      t.partial({
        isCurrent: t.boolean,
      }),
    ]),
  ),
  (ced) => hasCurrentCustomEncryption(ced),
  'CustomEncryptionData',
);

const validateCustomEncryptionData = (data) => validateWithIO(data, CustomEncryptionDataIO);

module.exports = {
  CustomEncryptionDataIO,
  validateCustomEncryptionData,
};
