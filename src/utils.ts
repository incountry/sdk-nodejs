function isJSON(str: unknown): str is string {
  try {
    JSON.parse(str as string);
    return true;
  } catch (e) {
    return false;
  }
}

type NoNullField<T> = { [P in keyof T]: NonNullable<T[P]> };

const omitNulls = <R extends Record<string, unknown>>(r: R): NoNullField<R> => Object.keys(r)
  .filter((k) => r[k] !== null)
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

export {
  Override,
  Reflected,
  isJSON,
  omitNulls,
  isRejected,
  reflect,
};
