import * as t from 'io-ts';
import { exact } from './exact';

type FilterStringValue = string | string[];
const FilterStringValueIO: t.Type<FilterStringValue> = t.union([t.string, t.array(t.string)]);

type FilterStringQuery = FilterStringValue | { $not?: FilterStringValue };
const FilterStringQueryIO: t.Type<FilterStringQuery> = t.union([
  FilterStringValueIO,
  exact(t.partial({ $not: FilterStringValueIO })),
]);

type FilterNumberValue = number | number[];
const FilterNumberValueIO: t.Type<FilterNumberValue> = t.union([t.number, t.array(t.number)]);

type FindFilterValue = FilterStringValue | FilterNumberValue;
const FindFilterValueIO: t.Type<FindFilterValue> = t.union([FilterNumberValueIO, FilterStringValueIO]);

type FilterNumberQuery =
  FilterNumberValue |
  {
    $not?: FilterNumberValue;
    $gt?: number;
    $gte?: number;
    $lt?: number;
    $lte?: number;
  };

const FilterNumberQueryIO: t.Type<FilterNumberQuery> = t.union([
  FilterNumberValueIO,
  exact(t.partial({
    $not: FilterNumberValueIO,
    $gt: t.number,
    $gte: t.number,
    $lt: t.number,
    $lte: t.number,
  })),
]);

type FindFilter = Record<string, FilterStringQuery | FilterNumberQuery>;
const FindFilterIO: t.Type<FindFilter> = t.record(t.string, t.union([FilterStringQueryIO, FilterNumberQueryIO]), 'FindFilter');

export {
  FilterStringValue,
  FilterStringQuery,
  FilterNumberValue,
  FilterNumberQuery,
  FindFilterValue,
  FindFilter,
  FilterStringValueIO,
  FilterStringQueryIO,
  FilterNumberValueIO,
  FindFilterValueIO,
  FilterNumberQueryIO,
  FindFilterIO,
};
