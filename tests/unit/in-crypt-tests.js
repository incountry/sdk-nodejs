/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const { InCrypt } = require('../../in-crypt');
const SecretKeyAccessor = require('../../secret-key-accessor');

const PLAINTEXTS = [
  '',
  'Howdy', // <-- English
  'Привет медвед', // <-- Russian
  'مرحبا', // <-- Arabic
  'हाय', // <-- Hindi
  '안녕', // <-- Korean
  'こんにちは', // Japanese
  '你好', // <- Chinese
];

const PREPARED_DATA_BY_VERSION = [
  {
    encrypted: 'pt:SW5Db3VudHJ5',
    version: 'pt',
    plain: 'InCountry',
    secretKeyAccessor: null,
  },
  {
    encrypted: '2:MyAeMDU3wnlWiqooUM4aStpDvW7JKU0oKBQN4WI0Wyl2vSuSmTIu8TY7Z9ljYeaLfg8ti3mhIJhbLSBNu/AmvMPBZsl6CmSC1KcbZ4kATJQtmZolidyXUGBlXC52xvAnFFGnk2s=',
    version: '2',
    plain: 'InCountry',
    secretKeyAccessor: new SecretKeyAccessor(() => new Promise((resolve) => { resolve('password'); })),
  },
  {
    encrypted: '1:8b02d29be1521e992b49a9408f2777084e9d8195e4a3392c68c70545eb559670b70ec928c8eeb2e34f118d32a23d77abdcde38446241efacb71922579d1dcbc23fca62c1f9ec5d97fbc3a9862c0a9e1bb630aaa3585eac160a65b24a96af5becef3cdc2b29',
    version: '1',
    plain: 'InCountry',
    secretKeyAccessor: new SecretKeyAccessor(() => new Promise((resolve) => { resolve('password'); })),
  },
  {
    encrypted: '7765618db31daf5366a6fc3520010327',
    version: '0',
    plain: 'InCountry',
    secretKeyAccessor: new SecretKeyAccessor(() => new Promise((resolve) => { resolve('password'); })),
  },
];


describe('InCrypt', function () {
  context('with different plain texts', function () {
    PLAINTEXTS.forEach((plain) => {
      it(`should encrypt and decrypt text: ${plain}`, async function () {
        const secretKeyAccessor = new SecretKeyAccessor((() => new Promise((resolve) => { resolve('supersecret'); })));
        const incrypt = new InCrypt(secretKeyAccessor);
        const encrypted = await incrypt.encryptAsync(plain);
        const decrypted = await incrypt.decryptAsync(encrypted);
        expect(encrypted).not.to.eql(plain);
        expect(decrypted).to.eql(plain);
      });

      it('should encrypt without SecretKeyAccessor', async function () {
        const incrypt = new InCrypt();
        const encrypted = await incrypt.encryptAsync(plain);
        expect(encrypted.includes('pt:')).equal(true);
      });
    });
  });
  context('with different encrypted text versions', function () {
    PREPARED_DATA_BY_VERSION.forEach((item) => {
      it(`should decrypt v${item.version} data`, async function () {
        const incrypt = new InCrypt(item.secretKeyAccessor);
        const decrypted = await incrypt.decryptAsync(item.encrypted);
        expect(decrypted).to.eql(item.plain);
      });

      if (item.version !== 'pt') {
        it('should not decrypt non pt without secretKeyAccessor', async function () {
          const incrypt = new InCrypt();
          await expect(incrypt.decryptAsync(item.encrypted))
            .to.be.rejectedWith(Error, 'No secretKeyAccessor provided. Cannot decrypt encrypted data');
        });
      }

      if (item.version === 'pt') {
        it('should not decrypt pt not base64', async function () {
          const incrypt = new InCrypt();
          const decrypted = await incrypt.decryptAsync(`${item.encrypted}stuff`);
          expect(decrypted).not.to.eql(item.plain);
        });
      }
    });
  });
});
