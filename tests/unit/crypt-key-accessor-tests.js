const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { SecretKeyAccessor } = require('../../lib/secret-key-accessor');
const { StorageClientError } = require('../../lib/errors');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('SecretKeyAccessor', () => {
  context('with asynchronous callback', () => {
    it('should access secret key if string has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => secret);
      const secretObj = await secretKeyAccessor.getSecret();
      expect(secretObj.secret).to.equal(secret);
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret }], currentVersion: 0 }));
      const secretObj = await secretKeyAccessor.getSecret();
      expect(secretObj.secret).to.equal(secret);
    });

    it('should access current version of secret key if version was not passed', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';

      const secretKeyAccessor00 = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret: secret0 }], currentVersion: 0 }));
      const secretObj00 = await secretKeyAccessor00.getSecret();
      expect(secretObj00.secret).to.equal(secret0);

      const secretKeyAccessor10 = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret: secret0 }, { version: 1, secret: secret1 }], currentVersion: 0 }));
      const secretObj10 = await secretKeyAccessor10.getSecret();
      expect(secretObj10.secret).to.equal(secret0);

      const secretKeyAccessor20 = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret: secret0 }, { version: 1, secret: secret1 }], currentVersion: 1 }));
      const secretObj20 = await secretKeyAccessor20.getSecret();
      expect(secretObj20.secret).to.equal(secret1);
    });

    it('should access specific version of secret key', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1supersecret1supersec';
      const secret2 = 'supersecret2supersecret2supersec';

      const secretKeyAccessor10 = new SecretKeyAccessor(async () => ({
        secrets: [
          { version: 0, secret: secret0 },
          { version: 1, secret: secret1, isKey: true },
          { version: 2, secret: secret2 },
        ],
        currentVersion: 0,
      }));

      const secretObj10 = await secretKeyAccessor10.getSecret(0);
      expect(secretObj10.secret).to.equal(secret0);
      const secretObj11 = await secretKeyAccessor10.getSecret(1);
      expect(secretObj11.secret).to.equal(secret1);
      const secretObj12 = await secretKeyAccessor10.getSecret(2);
      expect(secretObj12.secret).to.equal(secret2);

      const secretKeyAccessor20 = new SecretKeyAccessor(async () => ({
        secrets: [
          { version: 0, secret: secret0 },
          { version: 1, secret: secret1 },
          { version: 2, secret: secret2, isKey: true },
        ],
        currentVersion: 1,
      }));

      const secretObj20 = await secretKeyAccessor20.getSecret(0);
      expect(secretObj20.secret).to.equal(secret0);
      const secretObj21 = await secretKeyAccessor20.getSecret(1);
      expect(secretObj21.secret).to.equal(secret1);
      const secretObj22 = await secretKeyAccessor20.getSecret(2);
      expect(secretObj22.secret).to.equal(secret2);
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const secretKeyAccessor = new SecretKeyAccessor(async () => { throw error; });
      expect(secretKeyAccessor.getSecret()).to.be.rejectedWith(error);
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ blabla: secret }));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if isKey or isForCustomEncryption are set to true both', async () => {
        const badSecretData = {
          secrets: [{
            version: 0, secret: '', isKey: true, isForCustomEncryption: true,
          }],
          currentVersion: 0,
        };

        const secretKeyAccessor = new SecretKeyAccessor(() => badSecretData);
        return expect(secretKeyAccessor.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if there is no key of "currentVersion" in "keys"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret }], currentVersion: 1 }));
        expect(secretKeyAccessor.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ secrets: [{ version: 1, secret }], currentVersion: 12 }));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if "currentVersion" or "version" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({
          secrets: [
            { version: 1, secret },
            { version: '2', secret }],
          currentVersion: 1,
        }));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => ({
          secrets: [{ version: '1', secret }], currentVersion: '1',
        }));
        expect(secretKeyAccessor2.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => ({
          secrets: [{ version: 11.11, secret }], currentVersion: 11.11,
        }));
        expect(secretKeyAccessor3.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if "isKey" is present but is not a boolean', () => {
        /* eslint-disable no-unused-expressions */

        const secret = 'supersecret';
        const invalidCallbackResult = (isKey) => ({
          secrets: [{ version: 1, secret, isKey }],
          currentVersion: 1,
        });

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => invalidCallbackResult(null));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => invalidCallbackResult(''));
        expect(secretKeyAccessor2.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => invalidCallbackResult(42));
        expect(secretKeyAccessor3.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if custom encryption key has wrong format', () => {
        /* eslint-disable no-unused-expressions */

        const secret1 = 'supersecretsupersecretsupersecre';
        const secret2 = secret1.substr(0, 31);
        const secret3 = `${secret1}123`;
        const invalidCallbackResult = (secret) => ({
          secrets: [{ version: 1, secret, isKey: true }],
          currentVersion: 1,
        });

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => invalidCallbackResult(secret1));
        expect(secretKeyAccessor1.getSecret()).not.to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => invalidCallbackResult(secret2));
        expect(secretKeyAccessor2.getSecret()).to.be.rejected;

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => invalidCallbackResult(secret3));
        expect(secretKeyAccessor3.getSecret()).to.be.rejected;
      });
    });
  });
  context('with synchronous callback', () => {
    it('should access secret key if string has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => secret);
      const secretObj = await secretKeyAccessor.getSecret();
      expect(secretObj.secret).to.equal(secret);
    });

    it('should access secret key if keys object has passed', async () => {
      const secret = 'supersecret';
      const secretKeyAccessor = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret }], currentVersion: 0 }));
      const secretObj = await secretKeyAccessor.getSecret();
      expect(secretObj.secret).to.equal(secret);
    });


    it('should access current version of secret key if version was not passed', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';

      const secretKeyAccessor00 = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret: secret0 }], currentVersion: 0 }));
      const secretObj00 = await secretKeyAccessor00.getSecret();
      expect(secretObj00.secret).to.equal(secret0);

      const secretKeyAccessor10 = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret: secret0 }, { version: 1, secret: secret1 }], currentVersion: 0 }));
      const secretObj10 = await secretKeyAccessor10.getSecret();
      expect(secretObj10.secret).to.equal(secret0);

      const secretKeyAccessor20 = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret: secret0 }, { version: 1, secret: secret1 }], currentVersion: 1 }));
      const secretObj20 = await secretKeyAccessor20.getSecret();
      expect(secretObj20.secret).to.equal(secret1);
    });

    it('should access specific version of secret key', async () => {
      const secret0 = 'supersecret0';
      const secret1 = 'supersecret1';
      const secret2 = 'supersecret2';

      const secretKeyAccessor10 = new SecretKeyAccessor(() => ({
        secrets: [
          { version: 0, secret: secret0 },
          { version: 1, secret: secret1 },
          { version: 2, secret: secret2 },
        ],
        currentVersion: 0,
      }));

      const secretObj10 = await secretKeyAccessor10.getSecret(0);
      expect(secretObj10.secret).to.equal(secret0);
      const secretObj11 = await secretKeyAccessor10.getSecret(1);
      expect(secretObj11.secret).to.equal(secret1);
      const secretObj12 = await secretKeyAccessor10.getSecret(2);
      expect(secretObj12.secret).to.equal(secret2);

      const secretKeyAccessor20 = new SecretKeyAccessor(() => ({
        secrets: [
          { version: 0, secret: secret0 },
          { version: 1, secret: secret1 },
          { version: 2, secret: secret2 },
        ],
        currentVersion: 1,
      }));

      const secretObj20 = await secretKeyAccessor20.getSecret(0);
      expect(secretObj20.secret).to.equal(secret0);
      const secretObj21 = await secretKeyAccessor20.getSecret(1);
      expect(secretObj21.secret).to.equal(secret1);
      const secretObj22 = await secretKeyAccessor20.getSecret(2);
      expect(secretObj22.secret).to.equal(secret2);
    });

    context('with malformed secret keys object', () => {
      it('should reject if secret keys object has bad structure', async () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({ blabla: secret }));
        await expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({ blabla: secret }));
        await expect(secretKeyAccessor2.validate()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if there is no key of "currentVersion"', () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret }], currentVersion: 1 }));
        expect(secretKeyAccessor.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({ secrets: [{ version: 1, secret }], currentVersion: 12 }));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if "currentVersion" or "version" is not an integer', () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({
          secrets: [
            { version: 1, secret },
            { version: '2', secret }],
          currentVersion: 1,
        }));
        expect(secretKeyAccessor1.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({
          secrets: [{ version: '1', secret }], currentVersion: '1',
        }));
        expect(secretKeyAccessor2.getSecret()).to.be.rejectedWith(StorageClientError);

        const secretKeyAccessor3 = new SecretKeyAccessor(() => ({
          secrets: [{ version: 11.11, secret }], currentVersion: 11.11,
        }));
        expect(secretKeyAccessor3.getSecret()).to.be.rejectedWith(StorageClientError);
      });

      it('should reject if secret keys object does not contain requested version of secret key', async () => {
        const secret = 'supersecret';
        const secretVersion = 42;

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({
          secrets: [
            { version: 1, secret },
            { version: 2, secret },
          ],
          currentVersion: 1,
        }));

        await expect(secretKeyAccessor1.getSecret(secretVersion)).to.be.rejectedWith(StorageClientError, `Secret not found for version ${secretVersion}`);
      });
    });
  });
});
