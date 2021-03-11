import * as chai from 'chai';
import { getStorageRecordDataArrayIO, MAX_RECORDS_IN_BATCH } from '../../../src/validation/user-input/storage-record-data-array';
import { isValid } from '../../../src/validation/utils';

const { expect } = chai;

const dummyString256 = Array(256).fill('x').join('');
const dummyString260 = Array(260).fill('x').join('');
const dummyString5000 = Array(5000).fill('x').join('');

const KEYS = Array(20).fill('x').map((_k, i) => `key${i + 1}`);

const VALID = [
  [{ recordKey: '1' }],
  [{ recordKey: '1', version: 0 }],
  [{ recordKey: '2', body: '', version: 0 }],
  [{ recordKey: '2', body: null, version: 0 }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: '',
  }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: null,
  }],
  [KEYS.reduce((acc, key) => Object.assign(acc, { [key]: dummyString5000 }), { recordKey: '1' })],

  Array(MAX_RECORDS_IN_BATCH).fill('x').map(() => ({ recordKey: '1' })),
  [{ recordKey: '1', expiresAt: new Date() }],
  [{ recordKey: '1', expiresAt: new Date().toISOString() }],
];

const INVALID = [
  true,
  false,
  () => {},
  '',
  -1,
  0,
  {},
  [],
  [{}],
  [{ key: 1 }],
  [{ key: '' }],
  [{ record_key: '' }],
  [{ record_key: 1 }],
  [{ record_key: '', body: 1 }],
  Array(MAX_RECORDS_IN_BATCH + 1).fill('x').map(() => ({ recordKey: '1' })),
  [{ recordKey: '1', expiresAt: 'test' }],
];

const VALID_NOT_HASHED = [
  [{ recordKey: '1' }],
  [{ recordKey: '1', version: 0 }],
  [{ recordKey: '2', body: '', version: 0 }],
  [{ recordKey: '2', body: null, version: 0 }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: '',
  }],
  [{
    recordKey: '2', body: null, version: 0, precommitBody: null,
  }],
  [{ recordKey: '1', key1: '123456890' }],
  [KEYS.reduce((acc, key) => Object.assign(acc, { [key]: dummyString256 }), { recordKey: '1' })],
];

const INVALID_NOT_HASHED = [
  true,
  false,
  () => {},
  '',
  -1,
  0,
  {},
  [],
  [{}],
  [{ key: 1 }],
  [{ key: '' }],
  [{ record_key: '' }],
  [{ record_key: 1 }],
  [{ record_key: '', body: 1 }],
  [KEYS.reduce((acc, key) => Object.assign(acc, { [key]: dummyString260 }), { recordKey: '1' })],
];

describe('Records Array validation', () => {
  [true, false].forEach((hashSearchKeys) => {
    context(`with "hashSearchKeys" ${hashSearchKeys ? 'enabled' : 'disabled'}`, () => {
      const codec = getStorageRecordDataArrayIO({ hashSearchKeys });

      let validData: any[];
      let invalidData: any[];

      if (hashSearchKeys) {
        validData = VALID;
        invalidData = INVALID;
      } else {
        validData = VALID_NOT_HASHED;
        invalidData = INVALID_NOT_HASHED;
      }

      describe('.is()', () => {
        it('should return false for invalid data', () => {
          invalidData.forEach((value) => {
            expect(codec.is(value)).to.equal(false, `invalid data ${JSON.stringify(value)} should fail`);
          });
        });

        it('should return true for valid data', () => {
          validData.forEach((value) => {
            expect(codec.is(value)).to.equal(true, `valid data ${JSON.stringify(value)} should work`);
          });
        });
      });

      describe('.decode()', () => {
        it('should not decode invalid data', () => {
          invalidData.forEach((value) => {
            expect(isValid(codec.decode(value))).to.equal(false, `invalid data ${JSON.stringify(value)} should fail`);
          });
        });

        it('should decode valid data', () => {
          validData.forEach((value) => {
            expect(isValid(codec.decode(value))).to.equal(true, `valid data ${JSON.stringify(value)} should work`);
          });
        });
      });
    });
  });
});
