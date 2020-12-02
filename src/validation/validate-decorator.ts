/* eslint no-param-reassign: "warn" */

import 'reflect-metadata';
import * as t from 'io-ts';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';
import { isInvalid, toInputValidationError } from './utils';

const foldValidation = fold(() => '', identity);

type getCodec = (params: any) => t.Mixed;
function validate(...getCodecs: Array<t.Mixed | getCodec>) {
  return function wrap(target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
    const method = descriptor.value;
    if (!t.Function.is(method)) {
      return descriptor;
    }

    const toError = toInputValidationError(`${propertyKey}() Validation Error: `);

    const type: { name: string } | undefined = Reflect.getMetadata('design:returntype', target, propertyKey);
    const isPromise = type && type.name === 'Promise';

    descriptor.value = function value(...args: any[]) {
      const codecs = getCodecs.map((v) => typeof v === 'function' ? v(this) : v);
      const results = codecs.map((codec, index) => codec.decode(args[index]));
      const invalid = results.find(isInvalid);

      if (invalid) {
        if (isPromise) {
          return Promise.reject(toError(invalid));
        }
        throw toError(invalid);
      }

      const newArgs = [...results.map(foldValidation), ...args.slice(results.length)];
      return method.apply(this, newArgs);
    };

    return descriptor;
  };
}

export {
  validate,
};
