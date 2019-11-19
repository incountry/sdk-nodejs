const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const SecretKeyAccessor = require('../../secret-key-accessor');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('SecretKeyAccessor', () => {
  context('with asynchronous callback', () => {
    it('should access secret key if string has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => secret);
      const keysObject = await secretKeyAccessor.secureAccessor();
      expect(keysObject).to.deep.equal({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 });
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 }));
      const keysObject = await secretKeyAccessor.secureAccessor();
      expect(keysObject).to.deep.equal({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 });
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const secretKeyAccessor = new SecretKeyAccessor(async () => { throw error; });
      expect(secretKeyAccessor.secureAccessor()).to.be.rejectedWith(error);
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(async () => { blabla: secret });
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;
      });

      it('should reject if there is no key of "currentKeyVersion" in "keys"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 1 }));
        expect(secretKeyAccessor.secureAccessor()).to.be.rejected;

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 1, key: secret }], currentKeyVersion: 12 }));
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;
      });

      it('should reject if "currentKeyVersion" or "keyVersion" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({  
          keys: [
            { keyVersion: 1, key: secret }, 
            { keyVersion: '2', key: secret }], 
          currentKeyVersion: 1 
        }));
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => ({  
          keys: [{ keyVersion: '1', key: secret }], currentKeyVersion: '1' 
        }));
        expect(secretKeyAccessor2.secureAccessor()).to.be.rejected;

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => ({
          keys: [{ keyVersion: 11.11, key: secret }], currentKeyVersion: 11.11 
        }));
        expect(secretKeyAccessor3.secureAccessor()).to.be.rejected;
      });
    });
  });
  context('with synchronous callback', () => {
    it('should access secret key if string has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => secret);
      const keysObject = await secretKeyAccessor.secureAccessor();
      expect(keysObject).to.deep.equal({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 });
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 }));
      const keysObject = await secretKeyAccessor.secureAccessor();
      expect(keysObject).to.deep.equal({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 });
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(() => { blabla: secret });
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;
      });

      it('should reject if there is no key of "currentKeyVersion" in "keys"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 1 }));
        expect(secretKeyAccessor.secureAccessor()).to.be.rejected;

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 1, key: secret }], currentKeyVersion: 12 }));
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;
      });

      it('should reject if "currentKeyVersion" or "keyVersion" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({  
          keys: [
            { keyVersion: 1, key: secret }, 
            { keyVersion: '2', key: secret }], 
          currentKeyVersion: 1 
        }));
        expect(secretKeyAccessor1.secureAccessor()).to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({  
          keys: [{ keyVersion: '1', key: secret }], currentKeyVersion: '1' 
        }));
        expect(secretKeyAccessor2.secureAccessor()).to.be.rejected;

        const secretKeyAccessor3 = new SecretKeyAccessor(() => ({
          keys: [{ keyVersion: 11.11, key: secret }], currentKeyVersion: 11.11 
        }));
        expect(secretKeyAccessor3.secureAccessor()).to.be.rejected;
      });
    });
  });
});
