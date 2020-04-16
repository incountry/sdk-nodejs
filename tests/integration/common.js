const dotenv = require('dotenv');
const createStorage = require('../../lib/storage');

dotenv.config();

/**
 * @param {Boolean} encryption - Encryption value
 * @param {Boolean} normalizeKeys - normalizeKeys value, default false
 */

const DEFAULT_SECRET = () => 'supersecret';

async function createDefaultStorage(encryption, normalizeKeys = false, getSecrets = DEFAULT_SECRET, customEncConfig) {
  return createStorage({
    apiKey: process.env.INC_API_KEY,
    environmentId: process.env.INC_ENVIRONMENT_ID,
    endpoint: process.env.INC_URL,
    encrypt: encryption,
    normalizeKeys,
    getSecrets,
  }, customEncConfig);
}

function noop() { }

module.exports = {
  createStorage: createDefaultStorage,
  noop,
};
