const {InCrypt, pad, unpad} = require('../../in-crypt');
const CryptKeyAccessor = require('../../crypt-key-accessor');

const expect = require('chai').expect;

describe('InCrypt', function() {
    context('with variable length unencrypted text', function() {
        [
            "1",
            "22",
            "333",
            "4444",
            "55555",
            "666666",
            "7777777",
            "88888888",
            "999999999",
            "aaaaaaaaaa",
            "bbbbbbbbbbb",
            "cccccccccccc",
            "ddddddddddddd",
            "eeeeeeeeeeeeee",
            "fffffffffffffff",
            "0000000000000000",
            "seventeen chars 0",
            "I am the very model of a modern major general"
        ].forEach(function(testCase) {
            it(`should pad the text and then unpad the text correctly: ${testCase}`, async function() {
                const padded = pad(testCase);
                const unpadded = unpad(padded);

                expect(unpadded).to.equal(testCase);
                expect(padded).to.not.equal(unpadded);
            })

            it(`should encrypt and decrypt correctly (asynchronous accessor): ${testCase}`, async function() {
                const cryptKeyAccessor = new CryptKeyAccessor(function() {
                    return new Promise((resolve) => { resolve('supersecret') })
                });
                const incrypt = new InCrypt(cryptKeyAccessor);

                const encrypted = await incrypt.encryptAsync(testCase);
                console.log(`e: ${encrypted}`);

                const decrypted = await incrypt.decryptAsync(encrypted);
                console.log(`d: ${decrypted}`);
                expect(decrypted).to.equal(testCase);
                expect(encrypted).to.not.equal(decrypted);
            })

            it(`should encrypt and decrypt correctly (synchronous accessor): ${testCase}`, async function() {
                const cryptKeyAccessor = new CryptKeyAccessor(() => 'supersecret');
                const incrypt = new InCrypt(cryptKeyAccessor);

                const encrypted = await incrypt.encryptAsync(testCase);
                console.log(`e: ${encrypted}`);

                const decrypted = await incrypt.decryptAsync(encrypted);
                console.log(`d: ${decrypted}`);
                expect(decrypted).to.equal(testCase);
                expect(encrypted).to.not.equal(decrypted);
            })
        })
    })
})