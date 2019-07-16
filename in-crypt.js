var //aes = require('aes-js'),
    crypto = require('crypto');

const BLOCK_SIZE = 16; // Bytes
const pad = function(s) {
    let slotsToPad = BLOCK_SIZE - (s.length % BLOCK_SIZE);
    let repeatedChar = String.fromCharCode(slotsToPad);
    let result = s + repeatedChar.repeat(slotsToPad);

    console.log(`slotsToPad: ${slotsToPad}, repeatedChar: ${repeatedChar}, result:${result}`);
    return result;
};

const unpad = function(s) {
    let end = s.length;

    let repeatedChar = s[end - 1];
    let slotsToPad = repeatedChar.charCodeAt(0);
    let result = s.substring(0, end - slotsToPad);
    
    console.log(`end: ${end}, slotsToPad: ${slotsToPad}, repeatedChar: ${repeatedChar}, result:${result}`);
    return result;
}

class InCrypt {
    constructor(key) {
//     ba = hashlib.sha256(key.encode('utf-8')).hexdigest();
//     self.salt = bytes.fromhex(ba)
//     self.key = self.salt[0:16]
//     self.iv = self.salt[16:32]
        //var ba = crypto.
        //this._salt = aes.
    }
    
    encrypt(raw) {
        var padded = pad(raw);
//      cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
//     return cipher.encrypt(raw).hex()
    }

    decrypt(enc) {
//     enc = bytes.fromhex(enc)
//     cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
//     return unpad(cipher.decrypt(enc)).decode('utf8')
    }
    
    hash(data) {
//     hash = hmac.new(self.salt, data.encode('utf-8'), digestmod=hashlib.sha256).digest().hex()
//     return hash
    }


}

module.exports = InCrypt;
module.exports.pad = pad;
module.exports.unpad = unpad;