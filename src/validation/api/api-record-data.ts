import { ApiRecord } from './api-record';

type ApiRecordData = { record_key: string } & Partial<Omit<ApiRecord, 'record_key'>>

export {
  ApiRecordData,
};
