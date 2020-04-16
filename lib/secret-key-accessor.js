const { validationToPromise, toStorageClientError } = require('./validation/utils');
const { SecretsDataIO } = require('./validation/secrets-data');
const { StorageClientError } = require('./errors');

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
 * @callback GetSecretsCallback
 * @returns {string|SecretsData|Promise<string>|Promise<SecretsData>|unknown}
 */

class SecretKeyAccessor {
  /**
   * @param {GetSecretsCallback} getSecretsCallback
   */
  constructor(getSecretsCallback) {
    if (typeof getSecretsCallback !== 'function') {
      throw new StorageClientError('Provide callback function for secretData');
    }
    this.getSecretsCallback = getSecretsCallback;
  }

  async initialize() {
    await this.getSecret();
  }

  /**
   * @param {number|undefined} secretVersion optional, will fallback to "currentSecretVersion"
   * @return {Promise<{ secret: string, version: number }>}
   */
  async getSecret(secretVersion) {
    const secretData = await this.getSecrets();
    const version = secretVersion !== undefined ? secretVersion : secretData.currentVersion;
    const secret = secretData.secrets.find((s) => s.version === version);
    if (!secret) {
      throw new StorageClientError(`Secret not found for version ${secretVersion}`);
    }
    return secret;
  }

  /**
   * @returns {Promise<SecretsData>}
   */
  async getSecrets() {
    const secretData = await Promise.resolve(this.getSecretsCallback());
    if (typeof secretData === 'string') {
      return wrapToSecretsData(secretData);
    }

    return validationToPromise(SecretsDataIO.decode(secretData), toStorageClientError());
  }
}

SecretKeyAccessor.DEFAULT_VERSION = DEFAULT_VERSION;
module.exports = SecretKeyAccessor;
