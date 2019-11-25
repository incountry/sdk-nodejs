const Storage = require('../../../storage');
const SecretKeyAccessor = require('../../../secret-key-accessor');

/**
 * @param {Boolean} encryption - Encryption value
 */
function CreateStorage(encryption) {
  return new Storage(
    {
      encrypt: encryption,
    },
    new SecretKeyAccessor((() => 'supersecret')),
  );
}

module.exports = {
  CreateStorage,
};
