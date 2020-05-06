const { StorageCryptoError } = require('../errors');
const { reflect } = require('../utils');
const {
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
} = require('./custom-encryption-configs');

/**
 * @typedef {import('./validation/secrets-data').SecretsData} SecretsData
 */

/**
 * @typedef {import('./validation/custom-encryption-configs').CustomEncryptionConfig} CustomEncryptionConfig
 */

/**
 *  @param {SecretsData} secretData
 *  @param {Array<CustomEncryptionConfig>} customEncryptionConfigs
 *  @returns {Promise<Array<{ status: '', value: any } | { status: '', reason: any }>>}
 */
async function validateCustomEncryption(secretData, customEncryptionConfigs) {
  const secrets = secretData.secrets.filter((s) => s.isForCustomEncryption);
  if (secrets.length === 0) {
    throw new StorageCryptoError('No secret for Custom Encryption');
  }

  const results = await Promise.all(
    secrets.map((secret) => customEncryptionConfigs.map(async (config) => {
      const context = `[Custom enc version: ${config.version}; Secret version: ${secret.version}]`;
      const plaintext = 'incountry';
      try {
        const enc = await config.encrypt(plaintext, secret.secret, secret.version);
        if (typeof enc !== 'string') {
          throw new StorageCryptoError(`${context} ${CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC}. Got ${typeof enc}`);
        }
      } catch (e) {
        throw new StorageCryptoError(`${context} ${e.message}`);
      }

      try {
        const enc = await config.encrypt(plaintext, secret.secret, secret.version);
        const dec = await config.decrypt(enc, secret.secret, secret.version);

        if (typeof dec !== 'string') {
          throw new StorageCryptoError(`${context} ${CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC}. Got ${typeof dec}`);
        }

        if (dec !== plaintext) {
          throw new StorageCryptoError(`${context} decrypted data doesn't match the original input`);
        }
      } catch (e) {
        throw new StorageCryptoError(`${context} ${e.message}`);
      }
    }))
      .flat()
      .map(reflect),
  );

  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  if (errors.length) {
    return Promise.reject(errors);
  }

  return results;
}

module.exports = {
  validateCustomEncryption,
};
