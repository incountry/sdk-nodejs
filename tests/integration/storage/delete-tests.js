var Storage = require('../../../storage');
var CryptKeyAccessor = require('../../../crypt-key-accessor');

var expect = require('chai').expect;

var storage, testBody, countryCode, keyValue;

describe('Delete data from Storage', function () {

    before(async function () {
        storage = new Storage(
            {
                tls: true,
                encrypt: false
            },
            null,
            new CryptKeyAccessor(function () { return 'supersecret'; })
        );
        countryCode = 'US'
        keyValue = 'recordKey0'

        testBody = JSON.stringify({ "name": "PersonName" });
        await storage.writeAsync({
            country: countryCode,
            key: keyValue,
            body: testBody
        });
    });


    it('delete existing data', async function () {

        var deleteResponse = await storage.deleteAsync({
            country: countryCode,
            key: keyValue
        });

        expect(deleteResponse).to.exist;
        expect(deleteResponse.status).to.equal(200);
    });


    it('delete not existing data', async function () {

        var notExistingKey = 'NotExistingKey11'

        var deleteResponse = await storage.readAsync({
            country: countryCode,
            key: notExistingKey
        });

        expect(deleteResponse).to.exist;
        expect(deleteResponse.status).to.equal(404);
        expect(deleteResponse.error).to.equal(`Could not find a record for key: ${notExistingKey}`)
    }).timeout(20000);
});
