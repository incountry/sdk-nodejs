import * as t from 'io-ts';

type AttachmentWritableMeta = {
  fileName?: string;
  mimeType?: string;
};

const AttachmentWritableMetaIO: t.Type<AttachmentWritableMeta> = t.partial({
  fileName: t.string,
  mimeType: t.string,
});

export {
  AttachmentWritableMeta,
  AttachmentWritableMetaIO,
};
