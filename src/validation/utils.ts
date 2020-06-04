import * as t from 'io-ts';
import { clone } from 'io-ts-types/lib/clone';
import { isLeft, isRight, Left } from 'fp-ts/lib/Either';
import { getErrorMessage } from './get-error-message';
import { StorageClientError, StorageServerError } from '../errors';

const toStorageClientError = (prefix = '') => (failedValidation: Left<t.Errors>): StorageClientError => {
  const errorMessage = getErrorMessage(failedValidation);
  return new StorageClientError(`${prefix}${errorMessage}`, failedValidation);
};

const toStorageServerError = (prefix = '') => (failedValidation: Left<t.Errors>): StorageServerError => {
  const errorMessage = getErrorMessage(failedValidation);
  return new StorageServerError(`${prefix}${errorMessage}`, failedValidation);
};

function validationToPromise<A, B>(validation: t.Validation<A>, prepareError?: (failedValidation: Left<t.Errors>) => B): Promise<A> {
  return new Promise<A>((resolve, reject) => {
    if (isRight(validation)) {
      return resolve(validation.right);
    }
    const reason = prepareError ? prepareError(validation) : validation.left;
    return reject(reason);
  });
}

type PositiveIntBrand = {
  readonly PositiveInt: unique symbol;
}

const PositiveInt = t.refinement(
  t.Int,
  (n): n is t.Branded<t.Int, PositiveIntBrand> => n > 0,
  'PositiveInt',
);

type PositiveInt = t.TypeOf<typeof PositiveInt>


interface NonNegativeIntBrand {
  readonly NonNegativeInt: unique symbol;
}

const NonNegativeInt = t.refinement(
  t.Int,
  (n): n is t.Branded<t.Int, NonNegativeIntBrand> => n >= 0,
  'NonNegativeInt',
);

type NonNegativeInt = t.TypeOf<typeof NonNegativeInt>

function nullable(type: t.Mixed) {
  return t.union([type, t.null]);
}

function withDefault<C extends t.Any>(codec: C, defaultValue: any): C {
  const r: any = clone(codec);
  const { validate } = r;
  r.validate = (i: any, context: t.Context) => validate(i !== undefined ? i : defaultValue, context);
  // tslint:disable-next-line: deprecation
  r.decode = (i: any) => r.validate(i, t.getDefaultContext(r));
  return r;
}

type Codec<A> = t.Type<A, unknown>;

export {
  Codec,
  toStorageClientError,
  toStorageServerError,
  validationToPromise,
  PositiveInt,
  NonNegativeInt,
  nullable,
  withDefault,
  getErrorMessage,
  isLeft as isInvalid,
  isRight as isValid,
};
