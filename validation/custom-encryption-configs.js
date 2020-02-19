const t = require('io-ts');
const { validateWithIO } = require('./utils');

/**
 * @typedef {Object} CustomEncryptionConfig
 * @property {function} encrypt
 * @property {function} decrypt
 * @property {string} version
 * @property {boolean} [isCurrent]
 */

/**
 * @param {Array<CustomEncryptionConfig>} configs
 */
function hasUniqueVersions(configs) {
  const versions = new Set();
  return configs.find((c) => {
    if (versions.has(c.version)) {
      return true;
    }
    versions.add(c.version);
    return false;
  }) === undefined;
}

/**
 * @param {Array<CustomEncryptionConfig>} configs
 */
function notMoreThanOneCurrent(configs) {
  return configs.filter((c) => c.isCurrent === true).length <= 1;
}

const CustomEncryptionConfigIO = t.union([
  t.type({
    encrypt: t.Function,
    decrypt: t.Function,
    version: t.string,
  }),
  t.partial({
    isCurrent: t.boolean,
  }),
]);

const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY = 'Custom encryption configs should be an array';
const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS = 'Custom encryption configs should have unique versions';
const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT = 'Custom encryption configs should have only one current version';

const CustomEncryptionConfigsIO = new t.Type(
  'CustomEncryptionConfigs',
  (u) => t.array(CustomEncryptionConfigIO).is(u) && hasUniqueVersions(u) && notMoreThanOneCurrent(u),
  (u, c) => {
    if (!t.array(CustomEncryptionConfigIO).is(u)) {
      return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY);
    }

    if (!hasUniqueVersions(u)) {
      return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
    }

    if (!notMoreThanOneCurrent(u)) {
      return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT);
    }

    return t.success(u);
  },
  Array,
);


const validateCustomEncryptionConfigs = (data) => validateWithIO(data, CustomEncryptionConfigsIO);

module.exports = {
  CustomEncryptionConfigsIO,
  validateCustomEncryptionConfigs,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
};
