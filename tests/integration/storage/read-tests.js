var Storage = require('../../../storage');
var CryptKeyAccessor = require('../../../crypt-key-accessor');

var expect = require('chai').expect;

var storage, testBody, countryCode, keyValue;

describe('Read data from Storage', function () {

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


    it('C1883 Read data', async function () {

        var readResponse = await storage.readAsync({
            country: countryCode,
            key: keyValue
        });

        expect(readResponse).to.exist;
        expect(readResponse.status).to.equal(200);
        expect(readResponse.data).to.exist;
        expect(readResponse.data.body).to.equal(testBody);
    }).timeout(20000);


    it('C1884 Read not existing data', async function () {

        var notExistingKey = 'NotExistingKey11'
        
        var readResponse = await storage.readAsync({
            country: countryCode,
            key: notExistingKey
        });

        expect(readResponse).to.exist;
        expect(readResponse.status).to.equal(404);
        expect(readResponse.error).to.equal(`Could not find a record for key: ${notExistingKey}`)
    }).timeout(30000);
});
