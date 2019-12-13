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
        await storage.writeAsync({
          country: 'US',
          key: 'record0',
          body: testBody,
        });
      });

      it(`should read using these options: ${JSON.stringify(testCase)}`, async function () {
        const { record } = await storage.readAsync({
          country: 'US',
          key: 'record0',
        });

        expect(record.body).to.equal(testBody);
      });

      it(`should delete using these options: ${JSON.stringify(testCase)}`, async function () {
        const deleteResult = await storage.deleteAsync({
          country: 'US',
          key: 'record0',
        });

        expect(deleteResult.success).to.equal(true);
      });
    });
  });
});
