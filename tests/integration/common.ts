import dotenv from 'dotenv';
import * as defaultLogger from '../../src/logger';
import { createStorage } from '../../src/storage';
import { StorageOptions } from '../../src/validation/user-input/storage-options';
import { CustomEncryptionConfig } from '../../src/validation/user-input/custom-encryption-configs';

dotenv.config();

const COUNTRY = process.env.INT_INC_COUNTRY || 'us';

const DEFAULT_SECRET = () => 'supersecret';

type createDefaultStorageOptions = {
  encryption: boolean;
  normalizeKeys?: boolean;
  getSecrets?: StorageOptions['getSecrets'];
  hashSearchKeys?: boolean;
  customEncConfigs?: CustomEncryptionConfig[];
}

async function createDefaultStorage({
  encryption,
  normalizeKeys = false,
  getSecrets = DEFAULT_SECRET,
  hashSearchKeys,
  customEncConfigs,
}: createDefaultStorageOptions) {
  const storageOptions: StorageOptions = {
    environmentId: process.env.INT_INC_ENVIRONMENT_ID_OAUTH,
    oauth: {
      clientId: process.env.INT_INC_CLIENT_ID,
      clientSecret: process.env.INT_INC_CLIENT_SECRET,
    },
    logger: defaultLogger.withBaseLogLevel('warn'),
    endpoint: process.env.INC_URL,
    encrypt: encryption,
    normalizeKeys,
    getSecrets,
    countriesEndpoint: process.env.INT_COUNTRIES_LIST_ENDPOINT,
    hashSearchKeys,
  };

  const authEndpoint = process.env.INT_INC_DEFAULT_AUTH_ENDPOINT;
  if (authEndpoint) {
    storageOptions.oauth = {
      ...storageOptions.oauth,
      authEndpoints: { default: authEndpoint },
    };
  }

  return createStorage(storageOptions, customEncConfigs);
}

function noop() { }

export {
  createDefaultStorage as createStorage,
  noop,
  COUNTRY,
  DEFAULT_SECRET,
};
