import * as chai from 'chai';
import { Readable } from 'stream';
import { isValid } from '../../../src/validation/utils';
import { AttachmentDataIO, AttachmentData } from '../../../src/validation/api/attachment-data';


const { expect } = chai;

const createReadable = () => new Readable({
  objectMode: true,
  read() {},
});

const VALID_ATTACHMENT_DATA: AttachmentData[] = [
  { fileName: '', file: '' },
  { fileName: '', file: Buffer.from('') },
  { fileName: '', file: createReadable() },
  { fileName: '', file: '', mimeType: '' },
];
const INVALID_ATTACHMENT_DATA = [
  {},
  { fileName: 123 },
  { fileName: '123', file: 123 },
  { fileName: '123', file: [] },
  { fileName: '123', file: {} },
  { fileName: '123', file: () => {} },
  { fileName: '', file: '', mimeType: 123 },
  { fileName: '', file: '', mimeType: [] },
];

describe('Attachment data validation', () => {
  const codec = AttachmentDataIO;

  describe('.is()', () => {
    it('should return false for invalid data', () => {
      INVALID_ATTACHMENT_DATA.forEach((value) => {
        expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should return true for valid data', () => {
      VALID_ATTACHMENT_DATA.forEach((value) => {
        expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });

  describe('.decode()', () => {
    it('should not decode invalid data', () => {
      INVALID_ATTACHMENT_DATA.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)}`);
      });
    });

    it('should decode valid data', () => {
      VALID_ATTACHMENT_DATA.forEach((value) => {
        expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)}`);
      });
    });
  });
});
