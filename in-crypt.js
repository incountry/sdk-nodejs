const crypto = require('crypto');
const util = require('util');

const SecretKeyAccessor = require('./secret-key-accessor');
const { InCryptoError } = require('./errors');

const pbkdf2 = util.promisify(crypto.pbkdf2);

const IV_SIZE = 12;
const KEY_SIZE = 32;
const SALT_SIZE = 64;
const PBKDF2_ITERATIONS_COUNT = 10000;
const AUTH_TAG_SIZE = 16;
const VERSION = '2';
const PT_VERSION = 'pt';

const SUPPORTED_VERSIONS = ['0', '1', '2'];

class InCrypt {
  /**
  * @param {import('./secret-key-accessor')} secretKeyAccessor
  */
  constructor(secretKeyAccessor) {
    this._secretKeyAccessor = secretKeyAccessor;
  }

  setCustomEncryption(customEncryption) {
    this._customEncryption = customEncryption;
  }

  setCurrentEncryptionVersion(currentVersion) {
    this._customEncryptionVersion = currentVersion;
  }

  async getCurrentSecretVersion() {
    const { version } = await this._secretKeyAccessor.getSecret();
    return version;
  }

  async encryptAsync(text) {
    if (this._secretKeyAccessor === undefined) {
      return {
        message: `${PT_VERSION}:${Buffer.from(text).toString('base64')}`,
        secretVersion: SecretKeyAccessor.DEFAULT_VERSION,
      };
    }

    if (this._customEncryptionVersion) {
      const { encrypt } = this._customEncryption[this._customEncryptionVersion];
      const salt = crypto.randomBytes(SALT_SIZE);
      const { key, version } = await this._getEncryptionKey(salt);
      const ciphertext = await encrypt(text, key);

      return {
        message: `${this._customEncryptionVersion}:${ciphertext}`,
        secretVersion: version,
      };
    }
    return this.encryptDefault(text);
  }

  /**
   * @param {string} s
   */
  async decryptAsync(s) {
    const parts = s.split(':');

    if (parts.length !== 2) {
      throw new InCryptoError('Invalid ciphertext');
    }
    const [version, encrypted] = parts;

    if (!this._secretKeyAccessor && version !== PT_VERSION) {
      return this.decryptStub(encrypted);
    }
    if (this._customEncryption && this._customEncryption[version]) {
      return this._customEncryption[version].decrypt(encrypted);
    }
    const decrypt = this[`decryptV${version}`];
    if (decrypt === undefined) {
      throw new InCryptoError('Unknown decryptor version requested');
    }
    return decrypt.bind(this)(encrypted, version);
  }

  decryptStub(encrypted) {
    return encrypted;
  }

  decryptVpt(plainTextBase64) {
    return Buffer.from(plainTextBase64, 'base64').toString('utf-8');
  }

  /**
   * @param {string} text
   */
  async encryptDefault(text) {
    const { secret, version } = await this._secretKeyAccessor.getSecret();
    const iv = crypto.randomBytes(IV_SIZE);
    const salt = crypto.randomBytes(SALT_SIZE);
    const key = await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512');

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
   * @param {string} encryptedBase64
   * @param {number} secretVersion
   */
  async decryptV2(encryptedBase64, secretVersion) {
    const bData = Buffer.from(encryptedBase64, 'base64');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const { key } = await this._getEncryptionKey(salt, secretVersion);

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

    const { key } = await this._getEncryptionKey(salt, secretVersion);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  async _getEncryptionKey(salt, secretVersion = undefined) {
    if (!this._secretKeyAccessor) {
      return { key: null, version: null };
    }
    const { secret, isKey, version } = await this._secretKeyAccessor.getSecret(secretVersion);

    const key = isKey ? secret : (await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512'));
    return { key, version };
  }
}

module.exports.InCrypt = InCrypt;
module.exports.SUPPORTED_VERSIONS = SUPPORTED_VERSIONS;
