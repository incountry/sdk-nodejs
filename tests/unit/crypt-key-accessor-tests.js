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
      const keyObj = await secretKeyAccessor.getKey();
      expect(keyObj.key).to.equal(secret);
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 }));
      const keyObj = await secretKeyAccessor.getKey();
      expect(keyObj.key).to.equal(secret);
    });

    it('should access current version of secret key if version was not passed', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';

      const secretKeyAccessor00 = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret0 }, ], currentKeyVersion: 0 }));
      const keyObj00 = await secretKeyAccessor00.getKey();
      expect(keyObj00.key).to.equal(secret0);

      const secretKeyAccessor10 = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret0 }, { keyVersion: 1, key: secret1 }, ], currentKeyVersion: 0 }));
      const keyObj10 = await secretKeyAccessor10.getKey();
      expect(keyObj10.key).to.equal(secret0);

      const secretKeyAccessor20 = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret0 }, { keyVersion: 1, key: secret1 }, ], currentKeyVersion: 1 }));
      const keyObj20 = await secretKeyAccessor20.getKey();
      expect(keyObj20.key).to.equal(secret1);
    });

    it('should access specific version of secret key', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';
      const secret2 = 'supersecret2';

      const secretKeyAccessor10 = new SecretKeyAccessor(async () => ({ 
        keys: [
          { keyVersion: 0, key: secret0 }, 
          { keyVersion: 1, key: secret1 }, 
          { keyVersion: 2, key: secret2 }, 
        ], currentKeyVersion: 0 
      }));

      const keyObj10 = await secretKeyAccessor10.getKey(0);
      expect(keyObj10.key).to.equal(secret0);
      const keyObj11 = await secretKeyAccessor10.getKey(1);
      expect(keyObj11.key).to.equal(secret1);
      const keyObj12 = await secretKeyAccessor10.getKey(2);
      expect(keyObj12.key).to.equal(secret2);

      const secretKeyAccessor20 = new SecretKeyAccessor(async () => ({ 
        keys: [
          { keyVersion: 0, key: secret0 }, 
          { keyVersion: 1, key: secret1 }, 
          { keyVersion: 2, key: secret2 }, 
        ], currentKeyVersion: 1 
      }));

      const keyObj20 = await secretKeyAccessor20.getKey(0);
      expect(keyObj20.key).to.equal(secret0);
      const keyObj21 = await secretKeyAccessor20.getKey(1);
      expect(keyObj21.key).to.equal(secret1);
      const keyObj22 = await secretKeyAccessor20.getKey(2);
      expect(keyObj22.key).to.equal(secret2);
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const secretKeyAccessor = new SecretKeyAccessor(async () => { throw error; });
      expect(secretKeyAccessor.getKey()).to.be.rejectedWith(error);
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(async () => { blabla: secret });
        expect(secretKeyAccessor1.getKey()).to.be.rejected;
      });

      it('should reject if there is no key of "currentKeyVersion" in "keys"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 1 }));
        expect(secretKeyAccessor.getKey()).to.be.rejected;

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ keys: [{ keyVersion: 1, key: secret }], currentKeyVersion: 12 }));
        expect(secretKeyAccessor1.getKey()).to.be.rejected;
      });

      it('should reject if "currentKeyVersion" or "keyVersion" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({  
          keys: [
            { keyVersion: 1, key: secret }, 
            { keyVersion: '2', key: secret }], 
          currentKeyVersion: 1 
        }));
        expect(secretKeyAccessor1.getKey()).to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => ({  
          keys: [{ keyVersion: '1', key: secret }], currentKeyVersion: '1' 
        }));
        expect(secretKeyAccessor2.getKey()).to.be.rejected;

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => ({
          keys: [{ keyVersion: 11.11, key: secret }], currentKeyVersion: 11.11 
        }));
        expect(secretKeyAccessor3.getKey()).to.be.rejected;
      });
    });
  });
  context('with synchronous callback', () => {
    it('should access secret key if string has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => secret);
      const keyObj = await secretKeyAccessor.getKey();
      expect(keyObj.key).to.equal(secret);
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 0 }));
      const keyObj = await secretKeyAccessor.getKey();
      expect(keyObj.key).to.equal(secret);
    });


    it('should access current version of secret key if version was not passed', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';

      const secretKeyAccessor00 = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret0 }, ], currentKeyVersion: 0 }));
      const keyObj00 = await secretKeyAccessor00.getKey();
      expect(keyObj00.key).to.equal(secret0);

      const secretKeyAccessor10 = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret0 }, { keyVersion: 1, key: secret1 }, ], currentKeyVersion: 0 }));
      const keyObj10 = await secretKeyAccessor10.getKey();
      expect(keyObj10.key).to.equal(secret0);

      const secretKeyAccessor20 = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret0 }, { keyVersion: 1, key: secret1 }, ], currentKeyVersion: 1 }));
      const keyObj20 = await secretKeyAccessor20.getKey();
      expect(keyObj20.key).to.equal(secret1);
    });

    it('should access specific version of secret key', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';
      const secret2 = 'supersecret2';

      const secretKeyAccessor10 = new SecretKeyAccessor(() => ({ 
        keys: [
          { keyVersion: 0, key: secret0 }, 
          { keyVersion: 1, key: secret1 }, 
          { keyVersion: 2, key: secret2 }, 
        ], currentKeyVersion: 0 
      }));

      const keyObj10 = await secretKeyAccessor10.getKey(0);
      expect(keyObj10.key).to.equal(secret0);
      const keyObj11 = await secretKeyAccessor10.getKey(1);
      expect(keyObj11.key).to.equal(secret1);
      const keyObj12 = await secretKeyAccessor10.getKey(2);
      expect(keyObj12.key).to.equal(secret2);

      const secretKeyAccessor20 = new SecretKeyAccessor(() => ({ 
        keys: [
          { keyVersion: 0, key: secret0 }, 
          { keyVersion: 1, key: secret1 }, 
          { keyVersion: 2, key: secret2 }, 
        ], currentKeyVersion: 1 
      }));

      const keyObj20 = await secretKeyAccessor20.getKey(0);
      expect(keyObj20.key).to.equal(secret0);
      const keyObj21 = await secretKeyAccessor20.getKey(1);
      expect(keyObj21.key).to.equal(secret1);
      const keyObj22 = await secretKeyAccessor20.getKey(2);
      expect(keyObj22.key).to.equal(secret2);
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(() => { blabla: secret });
        expect(secretKeyAccessor1.getKey()).to.be.rejected;
      });

      it('should reject if there is no key of "currentKeyVersion" in "keys"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 0, key: secret }], currentKeyVersion: 1 }));
        expect(secretKeyAccessor.getKey()).to.be.rejected;

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({ keys: [{ keyVersion: 1, key: secret }], currentKeyVersion: 12 }));
        expect(secretKeyAccessor1.getKey()).to.be.rejected;
      });

      it('should reject if "currentKeyVersion" or "keyVersion" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({  
          keys: [
            { keyVersion: 1, key: secret }, 
            { keyVersion: '2', key: secret }], 
          currentKeyVersion: 1 
        }));
        expect(secretKeyAccessor1.getKey()).to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({  
          keys: [{ keyVersion: '1', key: secret }], currentKeyVersion: '1' 
        }));
        expect(secretKeyAccessor2.getKey()).to.be.rejected;

        const secretKeyAccessor3 = new SecretKeyAccessor(() => ({
          keys: [{ keyVersion: 11.11, key: secret }], currentKeyVersion: 11.11 
        }));
        expect(secretKeyAccessor3.getKey()).to.be.rejected;
      });
    });
  });
});
