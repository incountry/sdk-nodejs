/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const Storage = require('../../storage');
const SecretKeyAccessor = require('../../secret-key-accessor');

describe.skip('Storage', function () {
  context('with invalid constructor options', function () {

  });

  context('with valid constructor options', function () {
    [
      {
        tls: true,
        encrypt: false,
      },
      {
        tls: true,
        overrideWithEndpoint: false,
        endpoint: 'https://us.api.incountry.io',
      },
    ].forEach((testCase) => {
      const storage = new Storage(testCase, new SecretKeyAccessor((() => 'supersecret')));
      const testBody = JSON.stringify({ name: 'last' });

      it(`should write using these options: ${JSON.stringify(testCase)}`, async function () {
        const writeResponse = await storage.writeAsync({
          country: 'US',
          key: 'record0',
          body: testBody,
        });

        expect(writeResponse.status).to.equal(201);
      });

      it(`should read using these options: ${JSON.stringify(testCase)}`, async function () {
        const readResponse = await storage.readAsync({
          country: 'US',
          key: 'record0',
        });

        expect(readResponse.status).to.equal(200);
        expect(readResponse.data.body).to.equal(testBody);
      });

      it(`should delete using these options: ${JSON.stringify(testCase)}`, async function () {
        const deleteResponse = await storage.deleteAsync({
          country: 'US',
          key: 'record0',
        });

        expect(deleteResponse.status).to.equal(200);
      });
    })
  })
})
