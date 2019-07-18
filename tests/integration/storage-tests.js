var Storage = require('../../storage');

var expect = require('chai').expect;

describe('Storage', function() {
    context('with invalid constructor options', function() {

    })
    
    context('with valid constructor options', function() {
        [
            {
                tls: true // Use defaults from .env file
            },
            {
                tls: true
            }
        ].forEach(function(testCase) {
            var storage = new Storage(testCase);
            var testBody = 'inc test';

            it(`should write to, read from, and delete from (NA) storage using these options: ${JSON.stringify(testCase)}`, async function(){
                var writeResponse = await storage.writeAsync({
                    country: 'US',
                    key: 'record1',
                    body: testBody
                });

                //console.log(writeResponse);
                expect(writeResponse).to.exist;
                expect(writeResponse.status).to.equal(201);

                var readResponse = await storage.readAsync({
                    country: 'US',
                    key: 'record1'
                });

                //console.log(readResponse);
                expect(readResponse).to.exist;
                expect(readResponse.status).to.equal(200);
                expect(readResponse.data).to.exist;
                expect(readResponse.data.body).to.equal(testBody);

                // var deleteResponse = await storage.deleteAsync({

                // });

                return;
            })
        })
    })
})
