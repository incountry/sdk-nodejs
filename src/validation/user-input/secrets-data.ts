import * as t from 'io-ts';
import {
  Either, left, right, isRight, either, fold,
} from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { NonNegativeInt } from '../utils';

const KEY_SIZE = 32;

const SecretOrKeyGeneralIO = t.intersection([
  t.type({
    secret: t.string,
    version: NonNegativeInt,
  }),
  t.partial({
    isKey: t.boolean,
    isForCustomEncryption: t.boolean,
  }),
]);

type SecretOrKeyGeneral = t.TypeOf<typeof SecretOrKeyGeneralIO>;

type Secret = {
  secret: string;
  version: NonNegativeInt;
  isForCustomEncryption?: boolean;
}

type Key = {
  secret: Buffer;
  version: NonNegativeInt;
  isKey: true;
}

type SecretOrKey = Secret | Key;

const isKey = (s: SecretOrKey): s is Key => 'isKey' in s && s.isKey;
const isSecret = (s: SecretOrKey): s is Secret => !isKey(s);

function validateSecretOrKey(u: SecretOrKeyGeneral): Either<string, SecretOrKey> {
  if (u.isForCustomEncryption && u.isKey) {
    return left('Secret can either be "isKey" or "isForCustomEncryption", not both');
  }

  if (isKey(u)) {
    const decoded = Buffer.from(u.secret, 'base64');
    if (decoded.length !== KEY_SIZE) {
      return left(`Key should be ${KEY_SIZE} bytes-long buffer in a base64 encoded string. If it's a custom key, please provide 'isForCustomEncryption' param`);
    }
    return right({
      secret: decoded,
      isKey: true,
      version: u.version,
    });
  }

  return right(u);
}

const SecretOrKeyIO: t.Type<SecretOrKey> = new t.Type(
  'SecretOrKey',
  (u): u is SecretOrKey => SecretOrKeyGeneralIO.is(u) && isRight(validateSecretOrKey(u)),
  (u, c) => either.chain(SecretOrKeyGeneralIO.validate(u, c), (r) => pipe(validateSecretOrKey(r), fold((error) => t.failure(r, c, error), (v) => t.success(v)))),
  Object,
);

type SecretsData = {
  currentVersion: NonNegativeInt;
  secrets: Array<SecretOrKey>;
}

function hasSecretOfCurrentVersion(o: SecretsData): boolean {
  return o.secrets.findIndex((s) => s.version === o.currentVersion) !== -1;
}

const SecretsDataIO = t.refinement(
  t.type({
    currentVersion: NonNegativeInt,
    secrets: t.array(SecretOrKeyIO),
  }),
  (so) => hasSecretOfCurrentVersion(so),
  'SecretsData',
);

export {
  Secret,
  Key,
  SecretOrKey,
  SecretsData,
  SecretsDataIO,
  isKey,
  isSecret,
};
