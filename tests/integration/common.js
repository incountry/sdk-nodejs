const dotenv = require('dotenv');
const createStorage = require('../../storage');

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
    () => 'supersecret',
  );
}

function noop() { }

module.exports = {
  createStorage: createDefaultStorage,
  noop,
};
