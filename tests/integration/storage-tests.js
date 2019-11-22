const { expect } = require('chai');
const Storage = require('../../storage');
const SecretKeyAccessor = require('../../secret-key-accessor');


describe('Storage', () => {
  context('with invalid constructor options', () => {

  });

  context('with valid constructor options', () => {
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

      it(`should write using these options: ${JSON.stringify(testCase)}`, async () => {
        const writeResponse = await storage.writeAsync({
          country: 'US',
          key: 'record0',
          body: testBody,
        });

        // console.log(writeResponse);
        // expect(writeResponse).to.exist;
        expect(writeResponse.status).to.equal(201);
      });

      it(`should read using these options: ${JSON.stringify(testCase)}`, async () => {
        const readResponse = await storage.readAsync({
          country: 'US',
          key: 'record0',
        });

        // expect(readResponse).to.exist;
        expect(readResponse.status).to.equal(200);
        // expect(readResponse.data).to.exist;
        expect(readResponse.data.body).to.equal(testBody);
      });

      it(`should delete using these options: ${JSON.stringify(testCase)}`, async () => {
        const deleteResponse = await storage.deleteAsync({
          country: 'US',
          key: 'record0',
        });

        // expect(deleteResponse).to.exist;
        expect(deleteResponse.status).to.equal(200);
      });

      it(`should post to batches using these options: ${JSON.stringify(testCase)}`, async () => {
        // Post 10 writes
        for (let i = 1; i <= 4; i++) {
          await storage.writeAsync({
            country: 'US',
            key: `record${i}000`,
            body: `test data ${i}`,
          });
        }

        const batchResponse = await storage.batchAsync({
          country: 'US',
          GET: [
            'record1000', 'recordA', 'record2000', 'record3000', 'record10000', 'record111',
          ],
        });

        // expect(batchResponse.data).to.exist;
        expect(batchResponse.status).to.equal(201);
        // expect(batchResponse.data.GET).to.exist;

        const results = batchResponse.data.GET;
        expect(results).to.have.lengthOf(6);
      });
    });
  });
});
