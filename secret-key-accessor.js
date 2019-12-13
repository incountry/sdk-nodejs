const t = require('io-ts');
const { toPromise } = require('./utils');

/**
 * @typedef SecretsData
 * @property {Array<{ secret: string, version: number, isKey?: boolean }>} secrets
 * @property {number} currentVersion
 */

/**
 * @param {SecretsData} o
 * @return {boolean}
 */
function hasSecretOfCurrentVersion(o) {
  return o.secrets.findIndex((s) => s.version === o.currentVersion) !== -1;
}

const DEFAULT_VERSION = 0;

/**
 * @param {string} secret
 * @return {SecretsData}
 */
function wrapToSecretsData(secret) {
  return {
    currentVersion: DEFAULT_VERSION,
    secrets: [{
      secret,
      version: DEFAULT_VERSION,
    }],
  };
}

const SecretOrKey = t.brand(
  t.type({
    secret: t.string, version: t.Int, isKey: t.union([t.boolean, t.undefined]),
  }),
  (v) => !v.isKey || (v.isKey && v.secret.length === 32),
  'SecretOrKey',
);

const SecretsDataIO = t.brand(
  t.type({
    currentVersion: t.Int,
    secrets: t.array(SecretOrKey),
  }),
  (so) => hasSecretOfCurrentVersion(so),
  'SecretsDataIO',
);


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
      .then((v) => (typeof v === 'string' ? wrapToSecretsData(v) : toPromise(SecretsDataIO.decode(v))));
  }
}

SecretKeyAccessor.DEFAULT_VERSION = DEFAULT_VERSION;

module.exports = SecretKeyAccessor;
