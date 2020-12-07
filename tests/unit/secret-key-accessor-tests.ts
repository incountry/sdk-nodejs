import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { SecretKeyAccessor } from '../../src/secret-key-accessor';
import { SecretsProviderError, SecretsValidationError } from '../../src/errors';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('SecretKeyAccessor', () => {
  it('should throw error if no callback provided', () => {
    // @ts-ignore
    expect(() => new SecretKeyAccessor())
      .to.throw(SecretsValidationError, 'Provide callback function for secretData');
  });

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
      const secret1 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      const secret2 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

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
      expect(secretObj11.secret).to.deep.equal(Buffer.from(secret1, 'base64'));
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
      expect(secretObj22.secret).to.deep.equal(Buffer.from(secret2, 'base64'));
    });

    it('should reject if exception occurred in callback', async () => {
      const error = new Error('custom error');
      const secretKeyAccessor = new SecretKeyAccessor(async () => { throw error; });
      expect(secretKeyAccessor.getSecret())
        .to.be.rejectedWith(SecretsProviderError, 'Error calling getSecretsCallback(): custom error');
    });

    context('with malformed secret keys object', () => {
      it('should reject if keys object has bad structure', async () => {
        const secret = 'supersecret';
        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ blabla: secret }));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets should be Array<SecretOrKey> but got');
      });

      it('should reject if isKey or isForCustomEncryption are set to true both', async () => {
        const badSecretData = {
          secrets: [{
            version: 0, secret: '', isKey: true, isForCustomEncryption: true,
          }],
          currentVersion: 0,
        };

        const secretKeyAccessor = new SecretKeyAccessor(() => badSecretData);
        return expect(secretKeyAccessor.getSecret())
          .to.be.rejectedWith(SecretsValidationError, 'Secret can either be "isKey" or "isForCustomEncryption", not both');
      });

      it('should reject if there is no key of "currentVersion" in "keys"', async () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(async () => ({ secrets: [{ version: 0, secret }], currentVersion: 1 }));
        await expect(secretKeyAccessor.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData> should be SecretsData but got');

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({ secrets: [{ version: 1, secret }], currentVersion: 12 }));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData> should be SecretsData but got');
      });

      it('should reject if "currentVersion" or "version" is not an integer', async () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => ({
          secrets: [
            { version: 1, secret },
            { version: '2', secret }],
          currentVersion: 1,
        }));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.1.version should be NonNegativeInt but got "2"');

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => ({
          secrets: [{ version: '1', secret }], currentVersion: '1',
        }));
        await expect(secretKeyAccessor2.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.version should be NonNegativeInt but got "1"');

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => ({
          secrets: [{ version: 11.11, secret }], currentVersion: 11.11,
        }));
        await expect(secretKeyAccessor3.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.version should be NonNegativeInt but got 11.11');
      });

      it('should reject if "isKey" is present but is not a boolean', async () => {
        /* eslint-disable no-unused-expressions */

        const secret = 'supersecret';
        const invalidCallbackResult = (isKey: unknown) => ({
          secrets: [{ version: 1, secret, isKey }],
          currentVersion: 1,
        });

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => invalidCallbackResult(null));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.isKey should be boolean but got null');

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => invalidCallbackResult(''));
        await expect(secretKeyAccessor2.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.isKey should be boolean but got ""');

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => invalidCallbackResult(42));
        await expect(secretKeyAccessor3.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.isKey should be boolean but got 42');
      });

      it('should reject if encryption key has wrong format', async () => {
        /* eslint-disable no-unused-expressions */

        const superSecret = 'supersecretsupersecretsupersecre';
        const secret1 = Buffer.from(superSecret).toString('base64');
        const secret2 = Buffer.from(superSecret.substr(0, 31)).toString('base64');
        const secret3 = Buffer.from(`${superSecret}123`).toString('base64');
        const invalidCallbackResult = (secret: unknown) => ({
          secrets: [{ version: 1, secret, isKey: true }],
          currentVersion: 1,
        });

        const secretKeyAccessor1 = new SecretKeyAccessor(async () => invalidCallbackResult(secret1));
        await expect(secretKeyAccessor1.getSecret()).not.to.be.rejected;

        const secretKeyAccessor2 = new SecretKeyAccessor(async () => invalidCallbackResult(secret2));
        await expect(secretKeyAccessor2.getSecret())
          .to.be.rejectedWith(SecretsValidationError, "Key should be 32 bytes-long buffer in a base64 encoded string. If it's a custom key, please provide 'isForCustomEncryption' param");

        const secretKeyAccessor3 = new SecretKeyAccessor(async () => invalidCallbackResult(secret3));
        await expect(secretKeyAccessor3.getSecret())
          .to.be.rejectedWith(SecretsValidationError, "Key should be 32 bytes-long buffer in a base64 encoded string. If it's a custom key, please provide 'isForCustomEncryption' param");
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
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets should be Array<SecretOrKey> but got undefined');

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({ blabla: secret }));
        await expect(secretKeyAccessor2.validate())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets should be Array<SecretOrKey> but got undefined');
      });

      it('should reject if there is no key of "currentVersion"', async () => {
        const secret = 'supersecret';
        const secretKeyAccessor = new SecretKeyAccessor(() => ({ secrets: [{ version: 0, secret }], currentVersion: 1 }));
        await expect(secretKeyAccessor.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData> should be SecretsData');

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({ secrets: [{ version: 1, secret }], currentVersion: 12 }));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData> should be SecretsData');
      });

      it('should reject if "currentVersion" or "version" is not an integer', async () => {
        const secret = 'supersecret';

        const secretKeyAccessor1 = new SecretKeyAccessor(() => ({
          secrets: [
            { version: 1, secret },
            { version: '2', secret }],
          currentVersion: 1,
        }));
        await expect(secretKeyAccessor1.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.1.version should be NonNegativeInt but got "2"');

        const secretKeyAccessor2 = new SecretKeyAccessor(() => ({
          secrets: [{ version: '1', secret }], currentVersion: '1',
        }));
        await expect(secretKeyAccessor2.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.version should be NonNegativeInt but got "1"');

        const secretKeyAccessor3 = new SecretKeyAccessor(() => ({
          secrets: [{ version: 11.11, secret }], currentVersion: 11.11,
        }));
        await expect(secretKeyAccessor3.getSecret())
          .to.be.rejectedWith(SecretsValidationError, '<SecretsData>.secrets.0.version should be NonNegativeInt but got 11.11');
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

        await expect(secretKeyAccessor1.getSecret(secretVersion))
          .to.be.rejectedWith(SecretsValidationError, `Secret not found for version ${secretVersion}`);
      });
    });
  });
});
