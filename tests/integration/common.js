const dotenv = require('dotenv');
const createStorage = require('../../storage');

dotenv.config();

/**
 * @param {Boolean} encryption - Encryption value
 * @param {Boolean} normalizeKeys - normalizeKeys value, default false
 */

function createStorage(encryption, normalizeKeys = false) {
  return new Storage(
    {
      apiKey: process.env.INC_API_KEY,
      environmentId: process.env.INC_ENVIRONMENT_ID,
      endpoint: process.env.INC_URL,
      encrypt: encryption,
      normalizeKeys,
    },
    () => 'supersecret',
  );
}

function noop() { }

module.exports = {
  createStorage: createDefaultStorage,
  noop,
};
