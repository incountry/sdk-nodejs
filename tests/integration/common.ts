import dotenv from 'dotenv';
import { createStorage } from '../../src/storage';
import { CustomEncryptionConfig } from '../../src/validation/custom-encryption-configs';

dotenv.config();

const COUNTRY = process.env.INT_INC_COUNTRY || 'US';

const DEFAULT_SECRET = () => 'supersecret';

async function createDefaultStorage(encryption: boolean, normalizeKeys = false, getSecrets: Function = DEFAULT_SECRET, customEncConfigs?: CustomEncryptionConfig[]) {
  return createStorage({
    apiKey: process.env.INC_API_KEY,
    environmentId: process.env.INC_ENVIRONMENT_ID,
    endpoint: process.env.INC_URL,
    encrypt: encryption,
    normalizeKeys,
    getSecrets,
  }, customEncConfigs);
}

function noop() { }

export {
  createDefaultStorage as createStorage,
  noop,
  COUNTRY,
};
