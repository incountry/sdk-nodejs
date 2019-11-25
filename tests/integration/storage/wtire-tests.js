// import { createStorage2 } from './common';
// import the cat module
const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
let storage;

describe('Write data to Storage', () => {
  before(async () => {
    storage = createStorage(false);
  });


  it('C1911 Write data', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey0';
    const testBody = JSON.stringify({ name: 'PersonName' });

    const writeResponse = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    console.log(writeResponse);
    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });
});

describe('Write data to Storage with encryption', () => {
  before(async () => {
    storage = createStorage(true);
  });


  it('C1918 Write encrypted data', async () => {
    const countryCode = 'US';
    const keyValue = 'recordKey0';
    const testBody = JSON.stringify({ name: 'PersonName' });

    const writeResponse = await storage.writeAsync({
      country: countryCode,
      key: keyValue,
      body: testBody,
    });

    console.log(writeResponse);
    expect(writeResponse.status).to.equal(201);
    expect(writeResponse.data).to.equal('OK');
  });
});
