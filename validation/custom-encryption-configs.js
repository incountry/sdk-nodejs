const t = require('io-ts');
const either = require('fp-ts/lib/Either');

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

const CustomEncryptionConfigStructIO = t.union([
  t.type({
    encrypt: t.Function,
    decrypt: t.Function,
    version: t.string,
  }),
  t.partial({
    isCurrent: t.boolean,
  }),
]);

const getCustomEncryptionConfigsIO = (secret) => {
  const CustomEncryptionConfigIO = new t.Type(
    'CustomEncryptionConfigIO',
    (u) => CustomEncryptionConfigStructIO.is(u),
    (u, c) => {
      return either.chain(value => {
        const plaintext = 'incountry';

        try {
          const enc = value.encrypt(plaintext, secret.secret, secret.version);
          if (typeof enc !== 'string') {
            return t.failure(u, c, `${CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC}. Got ${typeof enc}`);
          }
        } catch(e) {
          return t.failure(u, c, `${e.message}`);
        }

        try {
          const enc = value.encrypt(plaintext, secret.secret, secret.version);
          const dec = value.decrypt(enc, secret.secret, secret.version);

          if (typeof dec !== 'string') {
            return t.failure(u, c, `${CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC}. Got ${typeof dec}`);
          }

          if (dec !== plaintext) {
            return t.failure(u, c, `decrypted data doesn't match the original input`);
          }
        } catch(e) {
          return t.failure(u, c, `${e.message}`);
        }
        
        return t.success(value);
      })(CustomEncryptionConfigStructIO.validate(u, c));
    },
    Object
  );
  
  const CustomEncryptionConfigArrayIO = t.array(CustomEncryptionConfigIO);
  
  const CustomEncryptionConfigsIO = new t.Type(
    'CustomEncryptionConfigs',
    (u) => CustomEncryptionConfigArrayIO.is(u) && hasUniqueVersions(u) && notMoreThanOneCurrent(u),
    (u, c) => {
      if (!t.UnknownArray.is(u)) {
        return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY);
      }
  
      return either.chain(value => {
        if (!hasUniqueVersions(value)) {
          return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS);
        }
    
        if (!notMoreThanOneCurrent(value)) {
          return t.failure(u, c, CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT);
        }
  
        return t.success(value);
      })(CustomEncryptionConfigArrayIO.validate(u, c));
    },
    Array,
  );

  return CustomEncryptionConfigsIO;
}


module.exports = {
  getCustomEncryptionConfigsIO,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
};
