const crypto = require('crypto');
const util = require('util');

const pbkdf2 = util.promisify(crypto.pbkdf2);

const IV_SIZE = 12;
const KEY_SIZE = 32;
const SALT_SIZE = 64;
const PBKDF2_ITERATIONS_COUNT = 100000;
const AUTH_TAG_SIZE = 16;

class InCrypt {
    constructor(cryptKeyAccessor) {
        this._cryptKeyAccessor = cryptKeyAccessor;
    }

    async encryptAsync(text) {
        const secret = await this._cryptKeyAccessor.secureAccessor();
        const iv = crypto.randomBytes(IV_SIZE);
        const salt = crypto.randomBytes(SALT_SIZE);
        const key = await pbkdf2(secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512');

        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([salt, iv, encrypted, tag]).toString('hex');
    }

    async decryptAsync(encryptedHex) {
        const secret = await this._cryptKeyAccessor.secureAccessor();
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
}

module.exports.InCrypt = InCrypt;
