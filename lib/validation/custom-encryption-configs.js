const t = require('io-ts');
const { either } = require('fp-ts/lib/Either');

const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY = 'Custom encryption configs should be an array';
const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS = 'Custom encryption configs should have unique versions';
const CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT = 'Custom encryption configs should have only one current version';
const CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC = 'Custom encryption \'encrypt\' method should return string';
const CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC = 'Custom encryption \'decrypt\' method should return string';

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
  const uniqueVersions = new Set(configs.map((c) => c.version));
  return configs.length === uniqueVersions.size;
}

/**
 * @param {Array<CustomEncryptionConfig>} configs
 */
function notMoreThanOneCurrent(configs) {
  return configs.filter((c) => c.isCurrent === true).length <= 1;
}

const CustomEncryptionConfigStructIO = t.intersection([
  t.type({
    encrypt: t.Function,
    decrypt: t.Function,
    version: t.string,
  }),
  t.partial({
    isCurrent: t.boolean,
  }),
]);

const CustomEncryptionConfigArrayIO = t.array(CustomEncryptionConfigStructIO);

const CustomEncryptionConfigsIO = new t.Type(
  'CustomEncryptionConfigs',
  (u) => t.UnknownArray.is(u) && u.length > 0 && CustomEncryptionConfigArrayIO.is(u) && hasUniqueVersions(u) && notMoreThanOneCurrent(u),
  (u, c) => {
    if (!t.UnknownArray.is(u) || u.length === 0) {
      return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY);
    }

    return either.chain(CustomEncryptionConfigArrayIO.validate(u, c), (value) => {
      if (!hasUniqueVersions(value)) {
        return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
      }

      if (!notMoreThanOneCurrent(value)) {
        return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT);
      }

      return t.success(value);
    });
  },
  Array,
);

module.exports = {
  CustomEncryptionConfigsIO,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
};
