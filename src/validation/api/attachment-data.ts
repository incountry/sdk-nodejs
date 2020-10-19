import * as t from 'io-ts';
import { Readable } from 'stream';
import { identity } from 'fp-ts/lib/function';

type File = Readable | Buffer | string;

type AttachmentData = {
  file: File;
  fileName?: string;
  mimeType?: string;
}

const isFile = (o: unknown): o is File => typeof o === 'string' || Buffer.isBuffer(o) || o instanceof Readable;

const FileIO = new t.Type<File>(
  'File',
  isFile,
  (o, c) => isFile(o) ? t.success(o) : t.failure(o, c),
  identity,
);

const AttachmentDataIO: t.Type<AttachmentData> = t.intersection([
  t.type({
    file: FileIO,
  }),
  t.partial({
    fileName: t.string,
    mimeType: t.string,
  }),
]);


export {
  AttachmentData,
  AttachmentDataIO,
};
