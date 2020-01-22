const t = require('io-ts');

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

module.exports = {
  SecretsDataIO,
};
