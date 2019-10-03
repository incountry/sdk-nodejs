const { expect } = require('chai');
const Storage = require('../../storage');
const CryptKeyAccessor = require('../../crypt-key-accessor');


describe('Storage', () => {
  context('with invalid constructor options', () => {

  });

  context('with valid constructor options', () => {
    [
      {
        tls: true,
        encrypt: true,
        overrideWithEndpoint: true,
        endpoint: 'https://ruc1.api.incountry.io',
      },
    ].forEach((testCase) => {
      const storage = new Storage(testCase, null, new CryptKeyAccessor((() => 'supersecret')));
      const testBody = 'inc test';

      it(`should write using these options: ${JSON.stringify(testCase)}`, async () => {
        const writeResponse = await storage.writeAsync({
          country: 'RU',
          key: 'record0',
          body: testBody,
        });

        // console.log(writeResponse);
        expect(writeResponse).to.exist;
        expect(writeResponse.status).to.equal(201);
      });

      it(`should read using these options: ${JSON.stringify(testCase)}`, async () => {
        const readResponse = await storage.readAsync({
          country: 'RU',
          key: 'record0',
        });

        expect(readResponse).to.exist;
        expect(readResponse.status).to.equal(200);
        expect(readResponse.data).to.exist;
        expect(readResponse.data.body).to.equal(testBody);
      });

      it(`should delete using these options: ${JSON.stringify(testCase)}`, async () => {
        const deleteResponse = await storage.deleteAsync({
          country: 'RU',
          key: 'record0',
        });

        expect(deleteResponse).to.exist;
        expect(deleteResponse.status).to.equal(200);
      });

      it(`should post to batches using these options: ${JSON.stringify(testCase)}`, async () => {
        // Post 10 writes
        for (let i = 1; i <= 10; i++) {
          await storage.writeAsync({
            country: 'RU',
            key: `record${i}`,
            body: `test data ${i}`,
          });
        }

        const batchResponse = await storage.batchAsync({
          country: 'RU',
          GET: [
            'record1', 'recordA', 'record2', 'record3', 'record10', 'record111',
          ],
        });

        expect(batchResponse.data).to.exist;
        expect(batchResponse.status).to.equal(201);
        expect(batchResponse.data.GET).to.exist;

        const results = batchResponse.data.GET;
        expect(results).to.have.lengthOf(6);
      });
    });
  });
});
