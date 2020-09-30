import { Stream } from 'stream';
import { StorageRecord, StorageRecordAttachment } from '../../src/validation/storage-record';
import { ApiRecord } from '../../src/validation/api/api-record';
import { ApiRecordAttachment } from '../../src/validation/api/api-record-attachment';

function fromStorageRecordAttachment(a: StorageRecordAttachment): ApiRecordAttachment {
  return {
    file_id: a.fileId,
    filename: a.fileName,
    hash: a.hash,
    mime_type: a.mimeType,
    size: a.size,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    download_link: a.downloadLink,
  };
}

function readStream(stream: Stream) {
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    stream.on('data', (chunk) => data.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(data)));
    stream.on('error', (error) => reject(error));
  });
}

export {
  readStream,
};
