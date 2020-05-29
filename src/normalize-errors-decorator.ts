/* eslint no-param-reassign: "warn" */
import 'reflect-metadata';
import * as t from 'io-ts';
import { StorageError } from './errors';

function normalizeErrors(errorMessagePrefix = 'Error during ') {
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
        const message = `${errorMessagePrefix}${propertyKey}() call: ${e.message}`;
        if (e instanceof StorageError) {
          e.message = message;
          throw e;
        } else {
          throw new StorageError(message);
        }
      }
    };

    return descriptor;
  };
}

export {
  normalizeErrors,
};
