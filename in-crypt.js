var aesjs = require('aes-js'),
    crypto = require('crypto'),
    utf8 = require('utf8');

const CryptKeyAccessor = require('./crypt-key-accessor');

const BLOCK_SIZE = 16; // Bytes
const pad = function(s) {
    let slotsToPad = BLOCK_SIZE - (s.length % BLOCK_SIZE);
    let repeatedChar = String.fromCharCode(slotsToPad);
    let result = s + repeatedChar.repeat(slotsToPad);

    return result;
};

const unpad = function(s) {
    let end = s.length;

    let repeatedChar = s[end - 1];
    let slotsToPad = repeatedChar.charCodeAt(0);
    let result = s.substring(0, end - slotsToPad);
    
    return result;
}

class InCrypt {
    constructor(cryptKeyAccessor) {
        this._cryptKeyAccessor = cryptKeyAccessor;
    }

    async encryptAsync(raw) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
               that._cryptKeyAccessor.secureAccessor(secret => {
                    let key = Buffer.allocUnsafe(16);
                    let iv = Buffer.allocUnsafe(16);
                    let hash = crypto.createHash('sha256');
        
                    let encodedKey = utf8.encode(secret);
                    let ba = hash.update(encodedKey).digest('hex');
                    let salt = Buffer.from(ba, 'hex');
                    salt.copy(key, 0, 0, 16);
                    salt.copy(iv, 0, 16, 32);
        
                    let aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
                    let padded = pad(raw);
                    let paddedBytes = aesjs.utils.utf8.toBytes(padded);
                    let encryptedBytes = aesCbc.encrypt(paddedBytes);
                    let encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
                    resolve(encryptedHex);
               });
            }
            catch (err) {
                reject(err)
            }
        });
    }

    async decryptAsync(encryptedHex) {
        var that = this;
        return new Promise(function(resolve, reject) {
            try {
                that._cryptKeyAccessor.secureAccessor(secret => {
                    let key = Buffer.allocUnsafe(16);
                    let iv = Buffer.allocUnsafe(16);
                    let hash = crypto.createHash('sha256');
        
                    let encodedKey = utf8.encode(secret);
                    let ba = hash.update(encodedKey).digest('hex');
                    let salt = Buffer.from(ba, 'hex');
                    salt.copy(key, 0, 0, 16);
                    salt.copy(iv, 0, 16, 32);
        
                    let aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);

                    let encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex)
                    let paddedBytes = aesCbc.decrypt(encryptedBytes);
                    let padded = aesjs.utils.utf8.fromBytes(paddedBytes);
                    let raw = unpad(padded);
                    resolve(raw);
                });
            }
            catch (err) {
                reject(err);
            }
        })
    }
    
    hash(data) {
// Not yet imnplemented
//     hash = hmac.new(self.salt, data.encode('utf-8'), digestmod=hashlib.sha256).digest().hex()
//     return hash
    }
}

module.exports.InCrypt = InCrypt;
module.exports.pad = pad;
module.exports.unpad = unpad;