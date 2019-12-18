const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const SecretKeyAccessor = require('../../secret-key-accessor');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('SecretKeyAccessor', () => {
  context('with asynchronous callback', () => {
    it('should access secret key', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => secret);
      const key = await secretKeyAccessor.secureAccessor();
      expect(key).to.equal(secret);
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const secretKeyAccessor = new SecretKeyAccessor(async () => { throw error; });
      expect(secretKeyAccessor.secureAccessor()).to.be.rejectedWith(error);
    });
  });
  context('with synchronous callback', () => {
    it('should access secret key', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => secret);
      const key = await secretKeyAccessor.secureAccessor();
      expect(key).to.equal(secret);
    });
  });
});
