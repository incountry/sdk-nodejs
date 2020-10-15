/* eslint no-param-reassign: "warn" */
import { StorageError } from './errors';

type AsyncFunction<A> = (...args: any[]) => Promise<A>;

function normalizeErrors() {
  return function wrap<A>(target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<AsyncFunction<A>>): TypedPropertyDescriptor<AsyncFunction<A>> {
    const method = descriptor.value;
    if (!method) {
      return descriptor;
    }

    descriptor.value = async function value(...args) {
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (e) {
        const message = `Error during ${target.constructor.name}.${propertyKey}() call: ${e.message}`;
        if (e instanceof StorageError) {
          e.message = message;
          throw e;
        } else {
          const error = new StorageError(message);
          error.stack = e.stack;
          throw error;
        }
      }
    };

    return descriptor;
  };
}

export {
  normalizeErrors,
};
