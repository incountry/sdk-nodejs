const { validationToPromise } = require('./validation/utils');
const { SecretsDataIO } = require('./validation/secrets-data');

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
    this._getSecretCallback = getSecretCallback;
  }

  /**
   * @param {number} secretVersion optional, will fallback to "currentSecretVersion"
   * @return {Promise<{ secret: string, version: number }>}
   */
  getSecret(secretVersion) {
    return this._getSecrets().then((so) => {
      const version = secretVersion !== undefined ? secretVersion : so.currentVersion;
      const item = so.secrets.find((s) => s.version === version);
      return item !== undefined
        ? item
        : Promise.reject(new Error(`Secret not found for version ${secretVersion}`));
    });
  }

  /**
   * @return {Promise<SecretsData>}
   */
  _getSecrets() {
    return Promise
      .resolve(this._getSecretCallback())
      .then((v) => (typeof v === 'string' ? wrapToSecretsData(v) : validationToPromise(SecretsDataIO.decode(v))));
  }
}

SecretKeyAccessor.DEFAULT_VERSION = DEFAULT_VERSION;
module.exports = SecretKeyAccessor;
