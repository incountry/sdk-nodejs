var CountriesCache = require('../../countries-cache');

var expect = require('chai').expect;

describe('CountriesCache', function() {
    context('with invalid constructor options', function() {

    })
    
    context('with default constructor options', function() {
        it(`should use callback with updated country list on hardRefresh:`, function(done){
            let countriesCache = new CountriesCache();
            countriesCache._hardRefresh(
                function(countries) {
                    console.log(countries);
                    expect(countries).to.be.not.null;
                    done();
                }
            );
        })
        
        it(`should return list of countries on hardRefreshAsync`, async function() {
            let countriesCache = new CountriesCache();
            let countries = await countriesCache._hardRefreshAsync();

            console.log(countries);
            expect(countries).to.be.not.null;
            return;
        })
    })
})