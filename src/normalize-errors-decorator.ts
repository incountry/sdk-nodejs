/* eslint no-param-reassign: "warn" */
import 'reflect-metadata';
import * as t from 'io-ts';
import { StorageError } from './errors';

function normalizeErrors() {
  return function wrap(_target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
    const method = descriptor.value;
    if (!t.Function.is(method)) {
      return descriptor;
    }

    descriptor.value = async function value(...args: unknown[]) {
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (e) {
        if (e instanceof StorageError) {
          throw e;
        } else {
          throw new StorageError(`Error during ${propertyKey}() : ${e.message}`);
        }
      }
    };

    return descriptor;
  };
}

export {
  normalizeErrors,
};
