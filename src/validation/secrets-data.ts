import * as t from 'io-ts';
import { NonNegativeInt } from './utils';

const KEY_SIZE = 32;

type SecretOrKey = {
  secret: string;
  version: NonNegativeInt;
  isKey?: boolean;
  isForCustomEncryption?: boolean;
};

type SecretsData = {
  currentVersion: NonNegativeInt;
  secrets: Array<SecretOrKey>;
}

function hasSecretOfCurrentVersion(o: SecretsData): boolean {
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

function isValidKey(key: string): boolean {
  return key.length === KEY_SIZE;
}

const SecretOrKey: t.Type<SecretOrKey> = new t.Type(
  'SecretOrKey',
  (u): u is SecretOrKey => SecretOrKeyGeneral.is(u) && (!u.isKey || isValidKey(u.secret)),
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

const SecretsDataIO = t.refinement(
  t.type({
    currentVersion: NonNegativeInt,
    secrets: t.array(SecretOrKey),
  }),
  (so) => hasSecretOfCurrentVersion(so),
  'SecretsData',
);

export {
  SecretOrKey,
  SecretsData,
  SecretsDataIO,
};
