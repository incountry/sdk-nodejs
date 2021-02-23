import * as t from 'io-ts';
import { exact } from '../exact';

type RequestOptions = {
  headers?: Record<string, string>;
  meta?: {};
};

const RequestOptionsIO: t.Type<RequestOptions> = exact(t.partial({
  headers: t.record(t.string, t.string),
  meta: t.UnknownRecord,
}, 'RequestOptionsIO'));

export {
  RequestOptions,
  RequestOptionsIO,
};
