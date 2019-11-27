const { expect } = require('chai');
const storageCommon = require('./common');

const createStorage = storageCommon.CreateStorage;
let storage;

describe('Delete data from Storage', () => {
  before(async () => {
    storage = createStorage(false);
  });

  it('C1885 Delete data', async () => {
    const data = {
      country: 'US',
      key: 'recordKey201',
      body: JSON.stringify({ name: 'PersonName' }),
    };
    const writeResponse = await storage.writeAsync(data);
    expect(writeResponse.data).to.equal('OK');

    const deleteResponse = await storage.deleteAsync({
      country: data.country,
      key: data.key,
    });

    expect(deleteResponse.status).to.equal(200);
  });


  it('C1886 Delete not existing data', async () => {
    const notExistingKey = 'NotExistingKey123';
    const deleteResponse = await storage.deleteAsync({
      country: 'US',
      key: notExistingKey,
    });

    expect(deleteResponse.status).to.equal(404);
    expect(deleteResponse.error).to.equal(`Could not find a record for key: ${notExistingKey}`);
  });

  describe('Encryption', () => {
    before(async () => {
      storage = createStorage(true);
    });

    it('C1920 Delete encrypted data', async () => {
      const data = {
        country: 'US',
        key: 'recordEncKey0101',
        body: JSON.stringify({ LastName: 'MyEncLastName' }),
      };
      const writeResponse = await storage.writeAsync(data);
      expect(writeResponse.status).to.equal(201);

      const deleteResponse = await storage.deleteAsync({
        country: data.country,
        key: data.key,
      });

      expect(deleteResponse.status).to.equal(200);
    });
  });
});
