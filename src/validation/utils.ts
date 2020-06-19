import * as t from 'io-ts';
import { clone } from 'io-ts-types/lib/clone';
import { isLeft, isRight } from 'fp-ts/lib/Either';
import { getErrorMessage } from './get-error-message';
import { StorageClientError, StorageServerError } from '../errors';
import { isJSON } from '../utils';

const toStorageClientError = (prefix = '') => (validation: t.Validation<unknown>): StorageClientError => {
  const errorMessage = getErrorMessage(validation);
  return new StorageClientError(`${prefix}${errorMessage}`, validation);
};

const toStorageServerError = (prefix = '') => (validation: t.Validation<unknown>): StorageServerError => {
  const errorMessage = getErrorMessage(validation);
  return new StorageServerError(`${prefix}${errorMessage}`, validation);
};

function validationToPromise<A, B>(validation: t.Validation<A>, prepareError?: (validation: t.Validation<A>) => B): Promise<A> {
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

function withDefault<C extends t.Any>(codec: C, defaultValue: any): C {
  const r: any = clone(codec);
  const { validate } = r;
  r.validate = (i: any, context: t.Context) => validate(i !== undefined ? i : defaultValue, context);
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

type Codec<A> = t.Type<A, unknown>;
type Int = t.Int;

export {
  Codec,
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
  JSONIO,
  PositiveInt,
  NonNegativeInt,
  withDefault,
  getErrorMessage,
  isLeft as isInvalid,
  isRight as isValid,
  Int,
};
