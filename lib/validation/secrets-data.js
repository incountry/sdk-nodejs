const t = require('io-ts');
const { NonNegativeInt } = require('./utils');

const KEY_SIZE = 32;

/**
 * @typedef SecretsData
 * @property {Array<{ secret: string, version: number, isKey?: boolean, isForCustomEncryption?:boolean }>} secrets
 * @property {number} currentVersion
 */

/**
 * @param {SecretsData} o
 * @return {boolean}
 */
function hasSecretOfCurrentVersion(o) {
  return o.secrets.findIndex((s) => s.version === o.currentVersion) !== -1;
}

const SecretOrKeyGeneral = t.intersection([
  t.type({
    secret: t.string,
    version: NonNegativeInt,
  }),
  t.partial({
    isKey: t.boolean,
    isForCustomEncryption: t.boolean,
  }),
]);

function isValidKey(key) {
  return key.length === KEY_SIZE;
}

const SecretOrKey = new t.Type(
  'SecretOrKey',
  (u) => SecretOrKeyGeneral.is(u) && (!u.isKey || isValidKey(u.secret)),
  (u, c) => {
    if (!SecretOrKeyGeneral.is(u)) {
      return t.failure(u, c);
    }

    if (u.isForCustomEncryption && u.isKey) {
      return t.failure(u, c, 'Secret can either be "isKey" or "isForCustomEncryption", not both');
    }

    if (u.isKey && !isValidKey(u.secret)) {
      return t.failure(u, c, `Key should be ${KEY_SIZE}-characters long. If it's a custom key, please provide 'isForCustomEncryption' param`);
    }

    return t.success(u);
  },
  Object,
);


const SecretsDataIO = t.brand(
  t.type({
    currentVersion: NonNegativeInt,
    secrets: t.array(SecretOrKey),
  }),
  (so) => hasSecretOfCurrentVersion(so),
  'SecretsData',
);

module.exports = {
  SecretsDataIO,
};
