import { omitUndefined } from '../../utils';
import {
  FindFilter,
  SEARCH_FIELD,
  FilterDateQuery,
  FilterStringQuery,
  FilterNumberQuery,
} from '../user-input/find-filter';

const API_RECORD_SEARCH_FIELD = 'search_keys';

type ApiFindFilter = Partial<{
  expires_at: FilterDateQuery;
  record_key: FilterStringQuery;
  parent_key: FilterStringQuery;
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
  profile_key: FilterStringQuery;
  service_key1: FilterStringQuery;
  service_key2: FilterStringQuery;
  service_key3: FilterStringQuery;
  service_key4: FilterStringQuery;
  service_key5: FilterStringQuery;
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
  [API_RECORD_SEARCH_FIELD]: string;
}>;

function filterFromStorageDataKeys(filter: FindFilter): ApiFindFilter {
  return omitUndefined({
    expires_at: filter.expiresAt,
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
    key11: filter.key11,
    key12: filter.key12,
    key13: filter.key13,
    key14: filter.key14,
    key15: filter.key15,
    key16: filter.key16,
    key17: filter.key17,
    key18: filter.key18,
    key19: filter.key19,
    key20: filter.key20,
    parent_key: filter.parentKey,
    service_key1: filter.serviceKey1,
    service_key2: filter.serviceKey2,
    service_key3: filter.serviceKey3,
    service_key4: filter.serviceKey4,
    service_key5: filter.serviceKey5,
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
    version: filter.version,
    [API_RECORD_SEARCH_FIELD]: filter[SEARCH_FIELD],
  });
}

export {
  ApiFindFilter,
  filterFromStorageDataKeys,
};
