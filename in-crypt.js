const crypto = require('crypto');
const util = require('util');
const utf8 = require('utf8');

const pbkdf2 = util.promisify(crypto.pbkdf2);

const IV_SIZE = 12;
const KEY_SIZE = 32;
const SALT_SIZE = 64;
const PBKDF2_ITERATIONS_COUNT = 10000;
const AUTH_TAG_SIZE = 16;
const VERSION = '2';

class InCrypt {
  /**
  * @param {import('./secret-key-accessor')} secretKeyAccessor
  */
  constructor(secretKeyAccessor) {
    this._secretKeyAccessor = secretKeyAccessor;
  }

  async encryptAsync(text) {
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
      secretVersion: version 
    };
  }

  /**
   * 
   * @param {string} s 
   * @param {number} secretVersion 
   */
  async decryptAsync(s, secretVersion) {
    const secret = await this._secretKeyAccessor.getSecret(secretVersion);
  
    const parts = s.split(':');
    let version;
    let encryptedHex;
    if (parts.length === 2) {
      [version, encryptedHex] = parts;
    } else {
      version = '0';
      encryptedHex = s;
    }
    const decrypt = this[`decryptV${version}`].bind(this);
    return decrypt(encryptedHex, secret.secret);
  }

  /**
   * 
   * @param {string} encryptedBase64 
   * @param {string} secret 
   */
  async decryptV2(encryptedBase64, secret) {
    const bData = Buffer.from(encryptedBase64, 'base64');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const key = await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  /**
   * 
   * @param {string} encryptedHex 
   * @param {string} secret 
   */
  async decryptV1(encryptedHex, secret) {
    const bData = Buffer.from(encryptedHex, 'hex');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const key = await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  /**
   * 
   * @param {string} encryptedHex 
   * @param {string} secret 
   */
  async decryptV0(encryptedHex, secret) {
    const key = Buffer.allocUnsafe(16);
    const iv = Buffer.allocUnsafe(16);
    const hash = crypto.createHash('sha256');

    const encodedKey = utf8.encode(secret);
    const ba = hash.update(encodedKey).digest('hex');
    const salt = Buffer.from(ba, 'hex');
    salt.copy(key, 0, 0, 16);
    salt.copy(iv, 0, 16, 32);

    const encryptedBytes = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);

    let decrypted = decipher.update(encryptedBytes);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

module.exports.InCrypt = InCrypt;
