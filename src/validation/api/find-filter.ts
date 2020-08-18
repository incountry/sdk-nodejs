import * as t from 'io-ts';
import { exact } from '../exact';
import { omitUndefined } from '../../utils';

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

function filterFromStorageDataKeys(filter: FindFilter): FindFilter {
  return omitUndefined({
    record_key: filter.recordKey,
    key1: filter.key1,
    key2: filter.key2,
    key3: filter.key3,
    key4: filter.key4,
    key5: filter.key5,
    key6: filter.key6,
    key7: filter.key7,
    key8: filter.key8,
    key9: filter.key9,
    key10: filter.key10,
    service_key1: filter.serviceKey1,
    service_key2: filter.serviceKey2,
    profile_key: filter.profileKey,
    range_key1: filter.rangeKey1,
    range_key2: filter.rangeKey2,
    range_key3: filter.rangeKey3,
    range_key4: filter.rangeKey4,
    range_key5: filter.rangeKey5,
    range_key6: filter.rangeKey6,
    range_key7: filter.rangeKey7,
    range_key8: filter.rangeKey8,
    range_key9: filter.rangeKey9,
    range_key10: filter.rangeKey10,
  });
}

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
  filterFromStorageDataKeys,
};
