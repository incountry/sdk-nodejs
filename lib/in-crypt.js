const crypto = require('crypto');
const util = require('util');
const { DEFAULT_VERSION } = require('./secret-key-accessor');
const { StorageCryptoError, StorageClientError } = require('./errors');
const { isValid, getErrorMessage } = require('./validation/utils');
const {
  CustomEncryptionConfigsIO,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
} = require('./validation/custom-encryption-configs');
const { validateCustomEncryption } = require('./validation/custom-encryption-configs-deep');

/**
 * @typedef {import('./validation/custom-encryption-configs').CustomEncryptionConfig} CustomEncryptionConfig
 */

const pbkdf2 = util.promisify(crypto.pbkdf2);

const IV_SIZE = 12;
const KEY_SIZE = 32;
const SALT_SIZE = 64;
const PBKDF2_ITERATIONS_COUNT = 10000;
const AUTH_TAG_SIZE = 16;
const VERSION = '2';
const PT_VERSION = 'pt';
const CUSTOM_ENCRYPTION_VERSION_PREFIX = 'c';

const CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA = 'Custom encryption not supported without secretKeyAccessor provided';

class InCrypt {
  /**
  * @param {import('./secret-key-accessor')} secretKeyAccessor
  */
  constructor(secretKeyAccessor) {
    this.secretKeyAccessor = secretKeyAccessor;
    this.customEncryption = null;
    this.currentCustomEncryptionVersion = null; // version of custom encryption marked "isCurrent" to use it instead of default encryption
  }

  async validate() {
    if (this.secretKeyAccessor !== undefined) {
      await this.secretKeyAccessor.validate();
    }

    if (this.customEncryption !== null) {
      if (this.secretKeyAccessor === undefined) {
        throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA);
      }
      const secretData = await this.secretKeyAccessor.getSecrets();
      await validateCustomEncryption(secretData, Object.values(this.customEncryption));
    }
  }

  packCustomEncryptionVersion(version) {
    return `${CUSTOM_ENCRYPTION_VERSION_PREFIX}${Buffer.from(version).toString('base64')}`;
  }

  /**
   *  @param {Array<CustomEncryptionConfig>} customEncryptionConfigs
   */
  setCustomEncryption(customEncryptionConfigs) {
    if (this.secretKeyAccessor === undefined) {
      throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA);
    }

    const validationResult = CustomEncryptionConfigsIO.decode(customEncryptionConfigs);
    if (!isValid(validationResult)) {
      const errorMessage = getErrorMessage(validationResult);
      throw new StorageClientError(`Custom Encryption Validation Error: ${errorMessage}`);
    }

    this.customEncryption = customEncryptionConfigs.reduce((result, item) => ({
      ...result,
      [this.packCustomEncryptionVersion(item.version)]: item,
    }), {});

    const current = customEncryptionConfigs.find((c) => c.isCurrent);
    if (current) {
      this.currentCustomEncryptionVersion = this.packCustomEncryptionVersion(current.version);
    }
  }

  async getCurrentSecretVersion() {
    const { version } = await this.secretKeyAccessor.getSecret();
    return version;
  }

  async encrypt(text) {
    if (this.secretKeyAccessor === undefined) {
      return {
        message: `${PT_VERSION}:${Buffer.from(text).toString('base64')}`,
        secretVersion: DEFAULT_VERSION,
      };
    }

    if (this.currentCustomEncryptionVersion) {
      return this.encryptCustom(text);
    }

    return this.encryptDefault(text);
  }

  async encryptCustom(text) {
    const { encrypt } = this.customEncryption[this.currentCustomEncryptionVersion];
    const { secret, version: secretVersion, isForCustomEncryption } = await this.secretKeyAccessor.getSecret();
    if (!isForCustomEncryption) {
      throw new StorageCryptoError(`Secret with version ${secretVersion} is not marked for custom encryption`);
    }

    const ciphertext = await encrypt(text, secret, secretVersion);
    if (typeof ciphertext !== 'string') {
      throw new StorageCryptoError(`${CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC}. Got ${typeof ciphertext}`);
    }

    return {
      message: `${this.currentCustomEncryptionVersion}:${ciphertext}`,
      secretVersion,
    };
  }

  /**
  * @param {string} text
  */
  async encryptDefault(text) {
    const iv = crypto.randomBytes(IV_SIZE);
    const salt = crypto.randomBytes(SALT_SIZE);
    const { key, version } = await this.getEncryptionKey(salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ciphertext = Buffer.concat([salt, iv, encrypted, tag]).toString('base64');
    return {
      message: `${VERSION}:${ciphertext}`,
      secretVersion: version,
    };
  }

  /**
   * @param {string} s
   * @param {number} secretVersion
   */
  async decrypt(s, secretVersion) {
    const parts = s.split(':');
    if (parts.length !== 2) {
      throw new StorageCryptoError('Invalid ciphertext');
    }
    const [version, encrypted] = parts;

    if (version === PT_VERSION) {
      return this.decryptVpt(encrypted);
    }

    if (!this.secretKeyAccessor) {
      throw new StorageCryptoError('No secretKeyAccessor provided. Cannot decrypt encrypted data');
    }

    if (version === '1') {
      return this.decryptV1(encrypted, secretVersion);
    }

    if (version === '2') {
      return this.decryptV2(encrypted, secretVersion);
    }

    if (this.customEncryption && this.customEncryption[version]) {
      return this.decryptCustom(encrypted, secretVersion, version);
    }

    throw new StorageCryptoError('Unknown decryptor version requested');
  }


  decryptVpt(plainTextBase64) {
    return Buffer.from(plainTextBase64, 'base64').toString('utf-8');
  }

  /**
   * @param {string} encryptedBase64
   * @param {number} secretVersion
   */
  async decryptV2(encryptedBase64, secretVersion) {
    const bData = Buffer.from(encryptedBase64, 'base64');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const { key } = await this.getEncryptionKey(salt, secretVersion);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  /**
   * @param {string} encryptedHex
   * @param {number} secretVersion
   */
  async decryptV1(encryptedHex, secretVersion) {
    const bData = Buffer.from(encryptedHex, 'hex');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const { key } = await this.getEncryptionKey(salt, secretVersion);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  /**
   * @param {string} encryptedHex
   * @param {number} secretVersion
   * @param {string} version
   */
  async decryptCustom(encrypted, secretVersion, version) {
    const { decrypt } = this.customEncryption[version];
    const { secret, isForCustomEncryption } = await this.secretKeyAccessor.getSecret(secretVersion);
    if (!isForCustomEncryption) {
      throw new StorageCryptoError(`Secret with version ${secretVersion} is not marked for custom encryption`);
    }

    const decrypted = await decrypt(encrypted, secret, secretVersion);
    if (typeof decrypted !== 'string') {
      throw new StorageCryptoError(`${CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC}. Got ${typeof decrypted}`);
    }
    return decrypted;
  }

  async getEncryptionKey(salt, secretVersion = undefined) {
    if (!this.secretKeyAccessor) {
      return { key: null, version: null };
    }
    const { secret, isKey, version } = await this.secretKeyAccessor.getSecret(secretVersion);

    const key = isKey ? secret : (await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512'));
    return { key, version };
  }
}

module.exports = {
  InCrypt,
  KEY_SIZE,
  VERSION,
  CUSTOM_ENCRYPTION_VERSION_PREFIX,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
};
