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

      it('should decrypt legacy', async function () {
        const cryptKeyAccessor = new CryptKeyAccessor(() => 'supersecret');
        const incrypt = new InCrypt(cryptKeyAccessor);
        const decrypted = await incrypt.decryptAsync('04aebf149ed5539aabbb3d817b90d324a96fdf6e8193370d5b45c7aaa9b0ba353d2f899c9b014a3e9284c1bf8f592511');
        const expected = 'I am the very model of a modern major general';
        expect(decrypted).to.eql(expected);
      });
    });
  });
});
