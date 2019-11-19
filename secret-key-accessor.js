const t = require('io-ts');
const { toPromise } = require('./utils');

/**
 * @typedef KeysObject
 * @property {Array<{ key: string, keyVersion: number }>} keys
 * @property {number} currentKeyVersion 
 */

/**
 * @param {KeysObject} o
 * @return {boolean}
 */
function hasKeyOfCurrentVersion(o) {
  return o.keys.findIndex(k => k.keyVersion === o.currentKeyVersion) !== -1;
}

const KeysObjectIO = t.brand(
  t.type({
    currentKeyVersion: t.Int,
    keys: t.array(
      t.type({ 
        key: t.string, keyVersion: t.Int 
      })
    )
  }),
  ko => hasKeyOfCurrentVersion(ko), 
  'KeysObjectIO'
)

const DEFAULT_VERSION = 0;

/**
 * Callback handles fetching keys and is provided by SDK user
 * Can return: 
 * - single key string
 * - KeyObject with diffrent verions of key
 * - Promise<string> or Promise<KeyObject> for any async jobs
 * 
 * @callback GetKeySecurelyCallback
 * @returns {string|KeysObject|Promise<string>|Promise<KeysObject>|unknown}
 */

class SecretKeyAccessor {
  /**
   * @param {GetKeySecurelyCallback} getKeySecurely
   */
  constructor(getKeySecurely) {
    this._getKeySecurely = getKeySecurely;
  }

  /**
   * @param {number} keyVersion optional, will fallback to "currentKeyVersion"
   * @return {Promise<{ key: string, keyVersion: number }>}
   */
  getKey(keyVersion) {
    return this._getKeys().then(ko => {
      const version = keyVersion !== undefined ? keyVersion : ko.currentKeyVersion;
      const item = ko.keys.find(k => k.keyVersion == version);
      return item !== undefined ? 
        item : 
        Promise.reject(new Error('Please provide secret key for this data'));
    });
  }

  /**
   * @return {Promise<KeysObject>}
   */
  _getKeys() {
    return Promise
      .resolve(this._getKeySecurely())
      .then(v => typeof v === 'string' ? this._wrapToKeysObject(v) : toPromise(KeysObjectIO.decode(v)));
  }

  /**
   * @param {string} key
   * @return {KeysObject}
   */
  _wrapToKeysObject(key) {
    return {
      currentKeyVersion: DEFAULT_VERSION,
      keys: [{
        key, 
        keyVersion: DEFAULT_VERSION
      }]
    }
  }
}

module.exports = SecretKeyAccessor;
