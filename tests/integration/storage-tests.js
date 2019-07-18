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

            it(`should write to, read from (NA), and delete from (NA) storage: ${JSON.stringify(testCase)}`, async function(){
                var x = await storage.writeAsync({
                    country: 'US',
                    key: 'record1',
                    body: 'jables test'
                });

                // var y = await storage.readAsync({

                // });

                return;
            })

            it(`should read from storage: ${JSON.stringify(testCase)}`, async function() {

            })
        })        
    })
})
