const dotenv = require('dotenv');
const Storage = require('../../storage');
const SecretKeyAccessor = require('../../secret-key-accessor');

dotenv.config();

const DEFAULT_SECRET_KEY_ACCESSOR = new SecretKeyAccessor((() => 'supersecret'));

/**
 * @param {Boolean} encryption - Encryption value
 */
function createStorage(encryption, secretKeyAccessor = DEFAULT_SECRET_KEY_ACCESSOR) {
  return new Storage(
    {
      apiKey: process.env.INC_API_KEY,
      environmentId: process.env.INC_ENVIRONMENT_ID,
      endpoint: process.env.INC_URL,
      encrypt: encryption,
    },
    secretKeyAccessor,
  );
}

function noop() { }

module.exports = {
  createStorage,
  noop,
};
