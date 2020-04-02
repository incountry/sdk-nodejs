const t = require('io-ts');
const { NonNegativeInt } = require('./utils');

const KEY_SIZE = 32;

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

const SecretOrKeyCustom = t.intersection([
  t.type({ secret: t.string, version: NonNegativeInt }),
  t.partial({ isKey: t.boolean }),
], 'SecretOrKeyCustom');

function isValidKey(key) {
  return key.length === KEY_SIZE;
}

const SecretOrKey = new t.Type(
  'SecretOrKey',
  (u) => SecretOrKeyCustom.is(u) && (!u.isKey || isValidKey(u.secret)),
  (u, c) => {
    if (!SecretOrKeyCustom.is(u)) {
      return t.failure(u, c);
    }

    if (u.isKey && !isValidKey(u.secret)) {
      return t.failure(u, c, `Key should be ${KEY_SIZE}-characters long`);
    }

    return t.success(u);
  },
  Number,
);

function getSecretsDataIO(forCustomEncryption = false) {
  return t.brand(
    t.type({
      currentVersion: NonNegativeInt,
      secrets: t.array(forCustomEncryption ? SecretOrKeyCustom : SecretOrKey),
    }),
    (so) => hasSecretOfCurrentVersion(so),
    'SecretsData',
  );
}

module.exports = {
  getSecretsDataIO,
};
