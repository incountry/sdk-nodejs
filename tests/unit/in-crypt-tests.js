var {InCrypt, pad, unpad} = require('../../in-crypt');

var expect = require('chai').expect;

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
            it(`should pad the text and then unpad the text correctly: ${testCase}`, function() {
                var padded = pad(testCase);
                var unpadded = unpad(padded);

                expect(unpadded).to.equal(testCase);
                expect(padded).to.not.equal(unpadded);
            })

            it(`should encrypt and decrypt correctly: ${testCase}`, function() {
                var incrypt = new InCrypt('supersecret');

                var encrypted = incrypt.encrypt(testCase);
                console.log(`e: ${encrypted}`);

                var decrypted = incrypt.decrypt(encrypted);
                console.log(`d: ${decrypted}`);
                expect(decrypted).to.equal(testCase);
                expect(encrypted).to.not.equal(decrypted);
            })
        })
    })
})