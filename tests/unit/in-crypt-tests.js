/* eslint-disable prefer-arrow-callback,func-names */
const { expect } = require('chai');
const { InCrypt } = require('../../in-crypt');
const CryptKeyAccessor = require('../../crypt-key-accessor');


describe('InCrypt', function () {
  context('with variable length unencrypted text', function () {
    [
      '1',
      '22',
      '333',
      '4444',
      '55555',
      '666666',
      '7777777',
      '88888888',
      '999999999',
      'aaaaaaaaaa',
      'bbbbbbbbbbb',
      'cccccccccccc',
      'ddddddddddddd',
      'eeeeeeeeeeeeee',
      'fffffffffffffff',
      '0000000000000000',
      'seventeen chars 0',
      'I am the very model of a modern major general',
    ].forEach((testCase) => {
      it(`should encrypt and decrypt correctly (asynchronous accessor): ${testCase}`, async function () {
        const cryptKeyAccessor = new CryptKeyAccessor((() => new Promise((resolve) => { resolve('supersecret'); })));
        const incrypt = new InCrypt(cryptKeyAccessor);

        const encrypted = await incrypt.encryptAsync(testCase);

        const decrypted = await incrypt.decryptAsync(encrypted);
        expect(decrypted).to.equal(testCase);
        expect(encrypted).to.not.equal(decrypted);
      });

      it(`should encrypt and decrypt correctly (synchronous accessor): ${testCase}`, async function () {
        const cryptKeyAccessor = new CryptKeyAccessor(() => 'supersecret');
        const incrypt = new InCrypt(cryptKeyAccessor);

        const encrypted = await incrypt.encryptAsync(testCase);

        const decrypted = await incrypt.decryptAsync(encrypted);
        expect(decrypted).to.equal(testCase);
        expect(encrypted).to.not.equal(decrypted);
      });

      it('should devrypt legacy', async function () {
        const cryptKeyAccessor = new CryptKeyAccessor(() => 'supersecret');
        const incrypt = new InCrypt(cryptKeyAccessor);
        const decrypted = await incrypt.decryptAsync('caee598134917da2573b089df328e8f1c9dcecee55e41d7497125b090976d668');
        console.log(decrypted)
      });
    });
  });
});
