import * as t from 'io-ts';
import { nonEmptyArray } from 'io-ts-types/lib/nonEmptyArray';
import { Either, right, left } from 'fp-ts/lib/Either';
import { NonNegativeInt, chainValidate } from './utils';
import { LimitIO } from './limit';


const SORT_ASC = 'asc';
const SORT_DESC = 'desc';

type SortingDirection = typeof SORT_ASC | typeof SORT_DESC;

type SearchKey =
  | 'key1'
  | 'key2'
  | 'key3'
  | 'key4'
  | 'key5'
  | 'key6'
  | 'key7'
  | 'key8'
  | 'key9'
  | 'key10'
  | 'key11'
  | 'key12'
  | 'key13'
  | 'key14'
  | 'key15'
  | 'key16'
  | 'key17'
  | 'key18'
  | 'key19'
  | 'key20';

const SEARCH_KEYS: SearchKey[] = [
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

type RangeKey =
| 'rangeKey1'
| 'rangeKey2'
| 'rangeKey3'
| 'rangeKey4'
| 'rangeKey5'
| 'rangeKey6'
| 'rangeKey7'
| 'rangeKey8'
| 'rangeKey9'
| 'rangeKey10';

type SortKey = SearchKey | RangeKey | 'createdAt' | 'updatedAt';

type SortingItem = Partial<Record<SortKey, SortingDirection>>;

type FindOptions = {
  limit?: number;
  offset?: number;
  sort?: SortingItem[];
};

const SortingDirection = t.keyof({
  [SORT_ASC]: null,
  [SORT_DESC]: null,
});

const SortingKey = t.keyof({
  createdAt: null,
  updatedAt: null,
  key1: null,
  key2: null,
  key3: null,
  key4: null,
  key5: null,
  key6: null,
  key7: null,
  key8: null,
  key9: null,
  key10: null,
  key11: null,
  key12: null,
  key13: null,
  key14: null,
  key15: null,
  key16: null,
  key17: null,
  key18: null,
  key19: null,
  key20: null,
  rangeKey1: null,
  rangeKey2: null,
  rangeKey3: null,
  rangeKey4: null,
  rangeKey5: null,
  rangeKey6: null,
  rangeKey7: null,
  rangeKey8: null,
  rangeKey9: null,
  rangeKey10: null,
});


const sortItemValidate = (i: { [key: string]: unknown }): Either<string, SortingItem> => {
  if (Object.keys(i).length < 1) {
    return left('One key per sorting item is required');
  }

  if (Object.keys(i).length > 1) {
    return left('Not more than one key per sorting item is allowed');
  }

  if (!SortingKey.is(Object.keys(i)[0])) {
    return left(`"${Object.keys(i)[0]}" is not allowed for sorting. Check documentation https://github.com/incountry/sdk-nodejs#find-records`);
  }

  if (!SortingDirection.is(Object.values(i)[0])) {
    return left('Only "asc" and "desc" is allowed as sorting direction');
  }

  return right(i);
};

const SortItemIO = chainValidate(t.UnknownRecord, sortItemValidate, 'SortItem');

const FindOptionsIO = t.partial({
  limit: LimitIO,
  offset: NonNegativeInt,
  sort: nonEmptyArray(SortItemIO),
}, 'FindOptions');


export {
  SORT_ASC,
  SORT_DESC,
  FindOptions,
  FindOptionsIO,
  SearchKey,
  SEARCH_KEYS,
  SortingItem,
};
