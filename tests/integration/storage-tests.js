var Storage = require('../../storage');

var expect = require('chai').expect;

describe('Storage', function() {
    context('with invalid constructor options', function() {

    })
    
    context('with valid constructor options', function() {
        [
            {
                tls: true, // Use defaults from .env file
                encrypt: false
            },
            {
                tls: true,
                encrypt: true,
                secretKey: 'supersecret'
            }
        ].forEach(function(testCase) {
            var storage = new Storage(testCase);
            var testBody = 'inc test';
            var encryptedKey;

            it(`should write using these options: ${JSON.stringify(testCase)}`, async function(){
                var writeResponse = await storage.writeAsync({
                    country: 'US',
                    key: 'record1',
                    body: testBody
                });

                //console.log(writeResponse);
                expect(writeResponse).to.exist;
                expect(writeResponse.status).to.equal(201);
            });

            it(`should read using these options: ${JSON.stringify(testCase)}`, async function() {
                var readResponse = await storage.readAsync({
                    country: 'US',
                    key: 'record1'
                });

                //console.log(readResponse);
                expect(readResponse).to.exist;
                expect(readResponse.status).to.equal(200);
                expect(readResponse.data).to.exist;
                expect(readResponse.data.body).to.equal(testBody);
            });

            it(`should delete using these options: ${JSON.stringify(testCase)}`, async function() {
                var deleteResponse = await storage.deleteAsync({
                    country: 'US',
                    key: 'record1'
                });

                expect(deleteResponse).to.exist;
                expect(deleteResponse.status).to.equal(200);

                return;
            })
        })
    })
})
