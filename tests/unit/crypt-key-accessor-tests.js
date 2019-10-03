const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const CryptKeyAccessor = require('../../crypt-key-accessor');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('CryptKeyAccessor', () => {
  context('with asynchronous callback', () => {
    it('should access secret key', async () => {
      const secret = 'supersecret';
      const cryptKeyAccessor = new CryptKeyAccessor(async () => secret);
      const key = await cryptKeyAccessor.secureAccessor();
      expect(key).to.equal(secret);
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const cryptKeyAccessor = new CryptKeyAccessor(async () => { throw error; });
      expect(cryptKeyAccessor.secureAccessor()).to.be.rejectedWith(error);
    });
  });
  context('with synchronous callback', () => {
    it('should access secret key', async () => {
      const secret = 'supersecret';
      const cryptKeyAccessor = new CryptKeyAccessor(() => secret);
      const key = await cryptKeyAccessor.secureAccessor();
      expect(key).to.equal(secret);
    });
  });
});
