import * as t from 'io-ts';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';
import { Codec } from '../utils';

type ApiRecordAttachment = {
  file_id: string;
  filename: string;
  hash: string;
  mime_type: string;
  size: number;
  created_at: Date;
  updated_at: Date;
  download_link: string;
}

const ApiRecordAttachmentIO: Codec<ApiRecordAttachment> = t.type({
  file_id: t.string,
  filename: t.string,
  hash: t.string,
  mime_type: t.string,
  size: t.number,
  created_at: DateFromISOString,
  updated_at: DateFromISOString,
  download_link: t.string,
});

export {
  ApiRecordAttachment,
  ApiRecordAttachmentIO,
};
