import {
  getFunctionName, Props, Context, ValidationError, InterfaceType, Decoder, Validation,
} from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

function stringify(v: unknown): string {
  if (typeof v === 'function') {
    return getFunctionName(v);
  }
  return JSON.stringify(v);
}

function last<T>(arr: Array<T>): T | undefined {
  return arr[arr.length - 1];
}

function formatContextPath(context: Context): string {
  return context
    .map(({ key, type }) => (key || `<${type.name}>`))
    .join('.');
}

function formatProps(props: Props): string {
  const formattedProps = Object.keys(props)
    .map((k) => `${k}: ${props[k].name}`)
    .join(', ');
  return `{ ${formattedProps} }`;
}

function formatType(type: Decoder<any, any> | InterfaceType<Props>): string {
  return 'props' in type ? formatProps(type.props) : type.name;
}

function isUnionType(type: any): boolean { return type._tag === 'UnionType'; }
function isIntersectionType(type: any): boolean { return type._tag === 'IntersectionType'; }

function getMessage(e: ValidationError): string {
  const filtered = e.context
    .filter((item, index, arr) => {
      const prevItem = arr[index - 1];
      if (!prevItem) {
        return true;
      }
      if (item.actual === prevItem.actual) {
        return false;
      }

      if (isIntersectionType(prevItem.type) || isUnionType(prevItem.type)) {
        return false;
      }

      return true;
    });

  const decoder = last(filtered);
  const desiredType = decoder ? formatType(decoder.type) : '';

  return `${formatContextPath(filtered)} should be ${desiredType} but got ${stringify(e.value)}${e.message ? `: ${e.message}` : ''}`;
}


const NO_ERRORS = 'No errors';

function getErrorMessage(validation: Validation<unknown>): string {
  if (isRight(validation)) {
    return NO_ERRORS;
  }
  const error = last(validation.left);
  return error ? getMessage(error) : '';
}

export {
  getErrorMessage,
  NO_ERRORS,
};
