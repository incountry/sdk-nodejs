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
            "seventeen chars 0"
        ].forEach(function(testCase) {
            it(`should pad the text and then unpad the text correctly: ${testCase}`, function() {
                //var incrypt = new InCrypt();
                var padded = pad(testCase);
                var unpadded = unpad(padded);
                //console.log(`"${padded}"`);
                expect(unpadded).to.equal(testCase);
            })
        })        
    })
})