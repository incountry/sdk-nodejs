const dotenv = require('dotenv');
const createStorage = require('../../storage');
const SecretKeyAccessor = require('../../secret-key-accessor');

dotenv.config();

/**
 * @param {Boolean} encryption - Encryption value
 */
async function createDefaultStorage(encryption) {
  return createStorage(
    {
      apiKey: process.env.INC_API_KEY,
      environmentId: process.env.INC_ENVIRONMENT_ID,
      endpoint: process.env.INC_URL,
      encrypt: encryption,
    },
    new SecretKeyAccessor(() => 'supersecret'),
  );
}

function noop() { }

module.exports = {
  createStorage: createDefaultStorage,
  noop,
};
