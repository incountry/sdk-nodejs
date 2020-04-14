const { validationToPromise, toStorageClientError } = require('./validation/utils');
const { SecretsDataIO } = require('./validation/secrets-data');
const { StorageCryptoError, StorageClientError } = require('./errors');

/**
 * @typedef {import('./validation/secrets-data').SecretsData} SecretsData
 */

/**
 * @param {string} secret
 * @return {SecretsData}
 */

const DEFAULT_VERSION = 0;

function wrapToSecretsData(secret) {
  return {
    currentVersion: DEFAULT_VERSION,
    secrets: [{
      secret,
      version: DEFAULT_VERSION,
    }],
  };
}

/**
 * Callback handles fetching keys/secrets and is provided by SDK user
 * Can return:
 * - single secret string
 * - KeyObject with different versions of key/secret
 * - Promise<string> or Promise<KeyObject> for any async jobs
 *
 * @callback GetSecretCallback
 * @returns {string|SecretsData|Promise<string>|Promise<SecretsData>|unknown}
 */

class SecretKeyAccessor {
  /**
   * @param {GetSecretCallback} getSecretCallback
   */
  constructor(getSecretCallback) {
    if (typeof getSecretCallback !== 'function') {
      throw new StorageClientError('Provide callback function for secretData');
    }
    this.getSecretCallback = getSecretCallback;
  }

  async initialize() {
    await this.getSecret();
  }

  /**
   * @param {number|undefined} secretVersion optional, will fallback to "currentSecretVersion"
   * @return {Promise<{ secret: string, version: number }>}
   */
  getSecret(secretVersion) {
    return this.getSecrets()
      .then((sd) => {
        const version = secretVersion !== undefined ? secretVersion : sd.currentVersion;
        const item = sd.secrets.find((s) => s.version === version);
        return item !== undefined
          ? item
          : Promise.reject(new StorageCryptoError(`Secret not found for version ${secretVersion}`));
      });
  }

  /**
   * @returns {Promise<SecretsData>}
   */
  getSecrets() {
    return Promise
      .resolve(this.getSecretCallback())
      .then((v) => typeof v === 'string'
        ? wrapToSecretsData(v)
        : validationToPromise(SecretsDataIO.decode(v), toStorageClientError()));
  }
}

SecretKeyAccessor.DEFAULT_VERSION = DEFAULT_VERSION;
module.exports = SecretKeyAccessor;
