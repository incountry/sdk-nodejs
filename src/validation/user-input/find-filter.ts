import intersection from 'lodash.intersection';
import { left, right, Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { exact } from '../exact';
import { DateIO, chainValidate } from '../utils';

const SEARCH_FIELD = 'searchKeys';
const EXCLUDED_KEYS_WHEN_SEARCHING = [
  'key1',
  'key2',
  'key3',
  'key4',
  'key5',
  'key6',
  'key7',
  'key8',
  'key9',
  'key10',
  'key11',
  'key12',
  'key13',
  'key14',
  'key15',
  'key16',
  'key17',
  'key18',
  'key19',
  'key20',
];
const SEARCH_FIELD_MIN_LENGTH = 3;
const SEARCH_FIELD_MAX_LENGTH = 200;

const SEARCH_FIELD_LENGTH_ERROR_MESSAGE = `filter.${SEARCH_FIELD} should be at least ${SEARCH_FIELD_MIN_LENGTH} but not more than ${SEARCH_FIELD_MAX_LENGTH}`;
const FILTER_SEARCH_KEYS_ERROR_MESSAGE = 'The "searchKeys" operator cannot be used in combination with any of "key1, key2, ..., key20" keys';

// filter string value
type FilterStringValue = string | string[] | null;
const FilterStringValueIO: t.Type<FilterStringValue> = t.union([t.string, t.array(t.string), t.null]);

type FilterStringQuery = FilterStringValue | { $not?: FilterStringValue };
const FilterStringQueryIO: t.Type<FilterStringQuery> = t.union([
  FilterStringValueIO,
  exact(t.partial({ $not: FilterStringValueIO })),
]);

// filter number value
type FilterNumberValue = number | number[] | null;
const FilterNumberValueIO: t.Type<FilterNumberValue> = t.union([t.number, t.array(t.number), t.null]);

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

// filter date value
type FilterDateValue = Date | Date[] | null;
const FilterDateValueIO: t.Type<FilterDateValue> = t.union([DateIO, t.array(DateIO), t.null]);

type FilterDateQuery =
FilterDateValue |
  {
    $not?: FilterDateValue;
    $gt?: Date;
    $gte?: Date;
    $lt?: Date;
    $lte?: Date;
  };

const FilterDateQueryIO: t.Type<FilterDateQuery> = t.union([
  FilterDateValueIO,
  exact(t.partial({
    $not: FilterDateValueIO,
    $gt: DateIO,
    $gte: DateIO,
    $lt: DateIO,
    $lte: DateIO,
  })),
]);

type FindFilter = Partial<{
  createdAt: FilterDateQuery;
  updatedAt: FilterDateQuery;
  expiresAt: FilterDateQuery;
  recordKey: FilterStringQuery;
  parentKey: FilterStringQuery;
  key1: FilterStringQuery;
  key2: FilterStringQuery;
  key3: FilterStringQuery;
  key4: FilterStringQuery;
  key5: FilterStringQuery;
  key6: FilterStringQuery;
  key7: FilterStringQuery;
  key8: FilterStringQuery;
  key9: FilterStringQuery;
  key10: FilterStringQuery;
  key11: FilterStringQuery;
  key12: FilterStringQuery;
  key13: FilterStringQuery;
  key14: FilterStringQuery;
  key15: FilterStringQuery;
  key16: FilterStringQuery;
  key17: FilterStringQuery;
  key18: FilterStringQuery;
  key19: FilterStringQuery;
  key20: FilterStringQuery;
  profileKey: FilterStringQuery;
  serviceKey1: FilterStringQuery;
  serviceKey2: FilterStringQuery;
  serviceKey3: FilterStringQuery;
  serviceKey4: FilterStringQuery;
  serviceKey5: FilterStringQuery;
  rangeKey1: FilterNumberQuery;
  rangeKey2: FilterNumberQuery;
  rangeKey3: FilterNumberQuery;
  rangeKey4: FilterNumberQuery;
  rangeKey5: FilterNumberQuery;
  rangeKey6: FilterNumberQuery;
  rangeKey7: FilterNumberQuery;
  rangeKey8: FilterNumberQuery;
  rangeKey9: FilterNumberQuery;
  rangeKey10: FilterNumberQuery;
  version: FilterNumberQuery;
  [SEARCH_FIELD]: string;
}>;

const isSearchFieldValue = (s: string): Either<string, string> => s.length < SEARCH_FIELD_MIN_LENGTH || s.length > SEARCH_FIELD_MAX_LENGTH
  ? left(SEARCH_FIELD_LENGTH_ERROR_MESSAGE)
  : right(s);

const SearchFieldIO = chainValidate(t.string, isSearchFieldValue, 'SearchFieldIO');

const FindFilterBasicIO: t.Type<FindFilter> = exact(t.partial({
  createdAt: FilterDateQueryIO,
  updatedAt: FilterDateQueryIO,
  expiresAt: FilterDateQueryIO,
  recordKey: FilterStringQueryIO,
  parentKey: FilterStringQueryIO,
  key1: FilterStringQueryIO,
  key2: FilterStringQueryIO,
  key3: FilterStringQueryIO,
  key4: FilterStringQueryIO,
  key5: FilterStringQueryIO,
  key6: FilterStringQueryIO,
  key7: FilterStringQueryIO,
  key8: FilterStringQueryIO,
  key9: FilterStringQueryIO,
  key10: FilterStringQueryIO,
  key11: FilterStringQueryIO,
  key12: FilterStringQueryIO,
  key13: FilterStringQueryIO,
  key14: FilterStringQueryIO,
  key15: FilterStringQueryIO,
  key16: FilterStringQueryIO,
  key17: FilterStringQueryIO,
  key18: FilterStringQueryIO,
  key19: FilterStringQueryIO,
  key20: FilterStringQueryIO,
  profileKey: FilterStringQueryIO,
  serviceKey1: FilterStringQueryIO,
  serviceKey2: FilterStringQueryIO,
  serviceKey3: FilterStringQueryIO,
  serviceKey4: FilterStringQueryIO,
  serviceKey5: FilterStringQueryIO,
  rangeKey1: FilterNumberQueryIO,
  rangeKey2: FilterNumberQueryIO,
  rangeKey3: FilterNumberQueryIO,
  rangeKey4: FilterNumberQueryIO,
  rangeKey5: FilterNumberQueryIO,
  rangeKey6: FilterNumberQueryIO,
  rangeKey7: FilterNumberQueryIO,
  rangeKey8: FilterNumberQueryIO,
  rangeKey9: FilterNumberQueryIO,
  rangeKey10: FilterNumberQueryIO,
  version: FilterNumberQueryIO,
  [SEARCH_FIELD]: SearchFieldIO,
}));

const hasExcludedKeys = (f: FindFilter): boolean => intersection(Object.keys(f), EXCLUDED_KEYS_WHEN_SEARCHING).length > 0;

const validateFindFilter = (f: FindFilter): Either<string, FindFilter> => {
  if (f[SEARCH_FIELD] && hasExcludedKeys(f)) {
    return left(FILTER_SEARCH_KEYS_ERROR_MESSAGE);
  }

  return right(f);
};

const FindFilterIO = chainValidate(FindFilterBasicIO, validateFindFilter, 'FindFilter');

export {
  FilterStringValue,
  FilterStringQuery,
  FilterNumberValue,
  FilterNumberQuery,
  FilterDateQuery,
  FindFilter,
  FilterStringValueIO,
  FilterStringQueryIO,
  FilterNumberValueIO,
  FilterNumberQueryIO,
  FindFilterIO,
  SEARCH_FIELD,
  SEARCH_FIELD_MAX_LENGTH,
};
