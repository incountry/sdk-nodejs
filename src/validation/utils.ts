import * as t from 'io-ts';
import { clone } from 'io-ts-types/lib/clone';
import { Readable } from 'stream';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  isLeft, isRight, Either, fold, either,
} from 'fp-ts/lib/Either';
import { getErrorMessage } from './get-error-message';
import { StorageClientError, StorageServerError } from '../errors';
import { isJSON } from '../utils';


type Validation<A> = Either<t.Errors, A>;

const toStorageClientError = (prefix = '') => (validation: Validation<unknown>): StorageClientError => {
  const errorMessage = getErrorMessage(validation);
  return new StorageClientError(`${prefix}${errorMessage}`, validation);
};

const toStorageServerError = (prefix = '') => (validation: Validation<unknown>): StorageServerError => {
  const errorMessage = getErrorMessage(validation);
  return new StorageServerError(`${prefix}${errorMessage}`, validation);
};

function validationToPromise<A, B>(validation: Validation<A>, prepareError?: (validation: Validation<A>) => B): Promise<A> {
  return new Promise<A>((resolve, reject) => {
    if (isRight(validation)) {
      return resolve(validation.right);
    }
    const reason = prepareError ? prepareError(validation) : validation.left;
    return reject(reason);
  });
}

const PositiveInt = t.refinement(
  t.Int,
  (n) => n > 0,
  'PositiveInt',
);

type PositiveInt = t.TypeOf<typeof PositiveInt>

const NonNegativeInt = t.refinement(
  t.Int,
  (n) => n >= 0,
  'NonNegativeInt',
);

type NonNegativeInt = t.TypeOf<typeof NonNegativeInt>

function optional<C extends t.Any>(codec: C): C {
  const r: any = clone(codec);
  const { validate } = r;
  r.validate = (i: any, context: t.Context) => i !== undefined ? validate(i, context) : t.success(undefined);
  // tslint:disable-next-line: deprecation
  r.decode = (i: any) => r.validate(i, t.getDefaultContext(r));
  return r;
}

type JSONObject = { [key: string]: JSON }
type JSONArray = Array<JSON>
type JSON = undefined | null | string | number | boolean | JSONArray | JSONObject

const JSONIO = new t.Type<JSON, string, string>(
  'JSONDecoder',
  (o): o is JSON => isJSON(o),
  (s, c) => {
    try {
      return t.success(JSON.parse(s));
    } catch (e) {
      return t.failure(s, c);
    }
  },
  String,
);

const isReadable = (o: unknown): o is Readable => o instanceof Readable;

const ReadableIO = new t.Type<Readable>(
  'File',
  isReadable,
  (o, c) => isReadable(o) ? t.success(o) : t.failure(o, c),
  t.identity,
);


type Codec<A> = t.Type<A, unknown>;
type Int = t.Int;

interface StringMax256Brand {
  readonly StringMax256: unique symbol;
}

const StringMax256 = t.brand(
  t.string,
  (s): s is t.Branded<string, StringMax256Brand> => s.length <= 256,
  'StringMax256',
);

const chainValidate = <A, B, BO, I>(type: t.Type<B, BO, I>, validate: (u: B) => Either<string | undefined, A>, name?: string): t.Type<A, A, I> => new t.Type(
  name || type.name,
  (u): u is A => {
    try {
      return isRight(validate(u as any));
    } catch (e) {
      return false;
    }
  },
  (i, c) => either.chain(
    type.validate(i, c),
    (b) => pipe(
      validate(b),
      fold(
        (error) => t.failure(b, c, error),
        (a) => t.success(a),
      ),
    ),
  ),
  (i) => i,
);

export {
  Codec,
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
  JSONIO,
  PositiveInt,
  NonNegativeInt,
  ReadableIO,
  optional,
  getErrorMessage,
  isLeft as isInvalid,
  isRight as isValid,
  Validation,
  Int,
  StringMax256,
  chainValidate,
};
