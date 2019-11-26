const t = require('io-ts');
const { toPromise } = require('./utils');

/**
 * @typedef SecretsObject
 * @property {Array<{ secret: string, version: number }>} secrets
 * @property {number} currentVersion
 */

/**
 * @param {SecretsObject} o
 * @return {boolean}
 */
function hasSecretOfCurrentVersion(o) {
  return o.secrets.findIndex((s) => s.version === o.currentVersion) !== -1;
}

const DEFAULT_VERSION = 0;

/**
 * @param {string} secret
 * @return {SecretsObject}
 */
function wrapToSecretsObject(secret) {
  return {
    currentVersion: DEFAULT_VERSION,
    secrets: [{
      secret,
      version: DEFAULT_VERSION,
    }],
  };
}

const SecretsObjectIO = t.brand(
  t.type({
    currentVersion: t.Int,
    secrets: t.array(
      t.type({
        secret: t.string, version: t.Int,
      }),
    ),
  }),
  (so) => hasSecretOfCurrentVersion(so),
  'SecretsObjectIO',
);


/**
 * Callback handles fetching keys and is provided by SDK user
 * Can return:
 * - single key string
 * - KeyObject with diffrent verions of key
 * - Promise<string> or Promise<KeyObject> for any async jobs
 *
 * @callback GetKeySecurelyCallback
 * @returns {string|SecretsObject|Promise<string>|Promise<SecretsObject>|unknown}
 */

class SecretKeyAccessor {
  /**
   * @param {GetKeySecurelyCallback} getKeySecurely
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
        : Promise.reject(new Error('Please provide secret key for this data'));
    });
  }

  /**
   * @return {Promise<SecretsObject>}
   */
  _getSecrets() {
    return Promise
      .resolve(this._getSecretCallback())
      .then((v) => (typeof v === 'string' ? wrapToSecretsObject(v) : toPromise(SecretsObjectIO.decode(v))));
  }
}

module.exports = SecretKeyAccessor;
