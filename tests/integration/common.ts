import dotenv from 'dotenv';
import * as defaultLogger from '../../src/logger';
import { createStorage } from '../../src/storage';
import { StorageOptions } from '../../src/validation/storage-options';
import { CustomEncryptionConfig } from '../../src/validation/custom-encryption-configs';

dotenv.config();

const COUNTRY = process.env.INT_INC_COUNTRY || 'us';

const DEFAULT_SECRET = () => 'supersecret';

type createDefaultStorageOptions = {
  encryption: boolean;
  useOAuth?: boolean;
  normalizeKeys?: boolean;
  getSecrets?: StorageOptions['getSecrets'];
  hashSearchKeys?: boolean;
  customEncConfigs?: CustomEncryptionConfig[];
}

async function createDefaultStorage({
  encryption,
  useOAuth = false,
  normalizeKeys = false,
  getSecrets = DEFAULT_SECRET,
  hashSearchKeys,
  customEncConfigs,
}: createDefaultStorageOptions) {
  let storageOptions: StorageOptions = {
    apiKey: process.env.INC_API_KEY,
    environmentId: process.env.INC_ENVIRONMENT_ID,
    endpoint: process.env.INC_URL,
    encrypt: encryption,
    normalizeKeys,
    getSecrets,
    countriesEndpoint: process.env.INT_COUNTRIES_LIST_ENDPOINT,
    hashSearchKeys,
  };

  if (useOAuth) {
    delete storageOptions.apiKey;
    const authEndpoint = process.env.INT_INC_DEFAULT_AUTH_ENDPOINT;
    storageOptions = {
      ...storageOptions,
      environmentId: process.env.INT_INC_ENVIRONMENT_ID_OAUTH,
      oauth: {
        clientId: process.env.INT_INC_CLIENT_ID,
        clientSecret: process.env.INT_INC_CLIENT_SECRET,
      },
      logger: defaultLogger.withBaseLogLevel('warn'),
    };
    if (authEndpoint) {
      storageOptions.oauth = {
        ...storageOptions.oauth,
        authEndpoints: { default: authEndpoint },
      };
    }
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
