import { omitUndefined } from '../../utils';
import {
  SearchKey,
  FindOptions, SortingItem,
} from '../user-input/find-options';

const SORT_ASC = 'asc';
const SORT_DESC = 'desc';

type SortingDirection = typeof SORT_ASC | typeof SORT_DESC;

type RangeKey =
| 'range_key1'
| 'range_key2'
| 'range_key3'
| 'range_key4'
| 'range_key5'
| 'range_key6'
| 'range_key7'
| 'range_key8'
| 'range_key9'
| 'range_key10';

type SortKey = SearchKey | RangeKey | 'created_at' | 'updated_at' | 'expires_at';

type ApiSortingItem = Record<SortKey, SortingDirection>;

type ApiFindOptions = {
  limit?: number;
  offset?: number;
  sort?: ApiSortingItem[];
};

function findOptionsFromStorageDataKeys({ limit, offset, sort }: FindOptions): ApiFindOptions {
  const findOptions: ApiFindOptions = {};
  if (sort) {
    findOptions.sort = sort.map((item: SortingItem) => omitUndefined({
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      expires_at: item.expiresAt,
      key1: item.key1,
      key2: item.key2,
      key3: item.key3,
      key4: item.key4,
      key5: item.key5,
      key6: item.key6,
      key7: item.key7,
      key8: item.key8,
      key9: item.key9,
      key10: item.key10,
      key11: item.key11,
      key12: item.key12,
      key13: item.key13,
      key14: item.key14,
      key15: item.key15,
      key16: item.key16,
      key17: item.key17,
      key18: item.key18,
      key19: item.key19,
      key20: item.key20,
      range_key1: item.rangeKey1,
      range_key2: item.rangeKey2,
      range_key3: item.rangeKey3,
      range_key4: item.rangeKey4,
      range_key5: item.rangeKey5,
      range_key6: item.rangeKey6,
      range_key7: item.rangeKey7,
      range_key8: item.rangeKey8,
      range_key9: item.rangeKey9,
      range_key10: item.rangeKey10,
    }));
  }

  if (limit !== undefined) {
    findOptions.limit = limit;
  }

  if (offset !== undefined) {
    findOptions.offset = offset;
  }

  return findOptions;
}

export {
  findOptionsFromStorageDataKeys,
  ApiFindOptions,
};
