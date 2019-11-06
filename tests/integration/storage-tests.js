var Storage = require('../../storage');
var SecretKeyAccessor = require('../../secret-key-accessor');

var expect = require('chai').expect;

describe('Storage', function() {
    context('with invalid constructor options', function() {

    })

    context('with valid constructor options', function() {
        [
            {
                tls: true,
                encrypt: false,
            },
            {
                tls: true,
                overrideWithEndpoint: false,
                endpoint: "https://us.api.incountry.io"
            }
        ].forEach(function(testCase) {
            var storage = new Storage(testCase, new SecretKeyAccessor(function() { return 'supersecret'; }));
            var testBody = JSON.stringify({ "name": "last" });

            it(`should write using these options: ${JSON.stringify(testCase)}`, async function(){
                var writeResponse = await storage.writeAsync({
                    country: 'US',
                    key: 'record0',
                    body: testBody
                });

                //console.log(writeResponse);
                expect(writeResponse).to.exist;
                expect(writeResponse.status).to.equal(201);
            });

            it(`should read using these options: ${JSON.stringify(testCase)}`, async function() {
                var readResponse = await storage.readAsync({
                    country: 'US',
                    key: 'record0'
                });

                expect(readResponse).to.exist;
                expect(readResponse.status).to.equal(200);
                expect(readResponse.data).to.exist;
                expect(readResponse.data.body).to.equal(testBody);
            });

            it(`should delete using these options: ${JSON.stringify(testCase)}`, async function() {
                var deleteResponse = await storage.deleteAsync({
                    country: 'US',
                    key: 'record0'
                });

                expect(deleteResponse).to.exist;
                expect(deleteResponse.status).to.equal(200);

                return;
            })

            it(`should post to batches using these options: ${JSON.stringify(testCase)}`, async function() {
                // Post 10 writes
                for (let i = 1; i <= 4; i++) {
                    await storage.writeAsync({
                        country: 'US',
                        key: `record${i}000`,
                        body: `test data ${i}`
                    });
                }

                var batchResponse = await storage.batchAsync({
                    "country": "US",
                    "GET": [
                        "record1000", "recordA", "record2000", "record3000", "record10000", "record111"
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
