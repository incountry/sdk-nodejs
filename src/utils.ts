import { PathLike } from "fs";

function isJSON(str: unknown): str is string {
  try {
    JSON.parse(str as string);
    return true;
  } catch (e) {
    return false;
  }
}

type NonNull<T> = T extends null ? never : T;

type NoNullField<T> = { [P in keyof T]: NonNull<T[P]> };

const omitNulls = <R extends Record<string, unknown>>(r: R): NoNullField<R> => Object.keys(r)
  .filter((k) => r[k] !== null)
  .reduce((acc, k) => Object.assign(acc, { [k]: r[k] }), {} as any);

type NonUndefined<T> = T extends undefined ? never : T;

type NoUndefinedField<T> = { [P in keyof T]: NonUndefined<T[P]> };

const omitUndefined = <R extends Record<string, unknown>>(r: R): NoUndefinedField<R> => Object.keys(r)
  .filter((k) => r[k] !== undefined)
  .reduce((acc, k) => Object.assign(acc, { [k]: r[k] }), {} as any);


type Override<T, U> = Omit<T, keyof U> & U;


type ReflectedFulfilled<T> = { status: 'fulfilled'; value: T };
type ReflectedRejected = { status: 'rejected'; reason: Error };
type Reflected<T> = ReflectedFulfilled<T> | ReflectedRejected;

const isRejected = (r: Reflected<unknown>): r is ReflectedRejected => r.status === 'rejected';

function reflect<T>(promiseLike: PromiseLike<T>): PromiseLike<Reflected<T>> {
  return promiseLike.then(
    (value) => ({ status: 'fulfilled', value }),
    (error) => ({ status: 'rejected', reason: error }),
  );
}

const isPathLike = (s: unknown): s is PathLike => typeof s === 'string' || Buffer.isBuffer(s);

export {
  Override,
  Reflected,
  isJSON,
  omitNulls,
  omitUndefined,
  isRejected,
  isPathLike,
  reflect,
};
