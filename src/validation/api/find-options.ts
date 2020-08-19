import * as t from 'io-ts';
import { NonNegativeInt } from '../utils';
import { LimitIO } from '../limit';

type FindOptions = {
  limit?: number;
  offset?: number;
};

const FindOptionsIO = t.partial({
  limit: LimitIO,
  offset: NonNegativeInt,
}, 'FindOptions');

export {
  FindOptions,
  FindOptionsIO,
};
