import * as t from 'io-ts';
import { Readable } from 'stream';
import { identity } from 'fp-ts/lib/function';

type File = Readable | Buffer | string;

type AttachmentData = {
  fileName: string;
  file: File;
}

const isFile = (o: unknown): o is File => typeof o === 'string' || Buffer.isBuffer(o) || o instanceof Readable;

const FileIO = new t.Type<File>(
  'File',
  isFile,
  (o, c) => isFile(o) ? t.success(o) : t.failure(o, c),
  identity,
);

const AttachmentDataIO: t.Type<AttachmentData> = t.type({
  fileName: t.string,
  file: FileIO,
});

export {
  AttachmentData,
  AttachmentDataIO,
};
