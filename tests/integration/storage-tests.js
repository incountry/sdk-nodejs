var Storage = require('../../storage');
var CryptKeyAccessor = require('../../crypt-key-accessor');

var expect = require('chai').expect;

describe('Storage', function() {
    context('with invalid constructor options', function() {

    })
    
    context('with valid constructor options', function() {
        [
            {
                tls: true,
                encrypt: true,
                overrideWithEndpoint: true,
                endpoint: "https://ruc1.api.incountry.io"
            }
        ].forEach(function(testCase) {
            var storage = new Storage(testCase, null, new CryptKeyAccessor(function() { return 'supersecret'; }));
            var testBody = 'inc test';

            it(`should write using these options: ${JSON.stringify(testCase)}`, async function(){
                var writeResponse = await storage.writeAsync({
                    country: 'RU',
                    key: 'record0',
                    body: testBody
                });

                //console.log(writeResponse);
                expect(writeResponse).to.exist;
                expect(writeResponse.status).to.equal(201);
            });

            it(`should read using these options: ${JSON.stringify(testCase)}`, async function() {
                var readResponse = await storage.readAsync({
                    country: 'RU',
                    key: 'record0'
                });

                expect(readResponse).to.exist;
                expect(readResponse.status).to.equal(200);
                expect(readResponse.data).to.exist;
                expect(readResponse.data.body).to.equal(testBody);
            });

            it(`should delete using these options: ${JSON.stringify(testCase)}`, async function() {
                var deleteResponse = await storage.deleteAsync({
                    country: 'RU',
                    key: 'record0'
                });

                expect(deleteResponse).to.exist;
                expect(deleteResponse.status).to.equal(200);

                return;
            })

            it(`should post to batches using these options: ${JSON.stringify(testCase)}`, async function() {
                // Post 10 writes
                for (let i = 1; i <= 10; i++) {
                    await storage.writeAsync({
                        country: 'RU',
                        key: `record${i}`,
                        body: `test data ${i}`
                    });
                }
                
                var batchResponse = await storage.batchAsync({
                    "country": "RU",
                    "GET": [
                        "record1", "recordA", "record2", "record3", "record10", "record111"
                    ]
                })

                expect(batchResponse.data).to.exist;
                expect(batchResponse.status).to.equal(201);
                expect(batchResponse.data["GET"]).to.exist;

                var results = batchResponse.data["GET"];
                expect(results).to.have.lengthOf(6);
            })
        })
    })
})
