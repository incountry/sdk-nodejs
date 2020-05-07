const chai = require('chai');

const { expect } = chai;

const { isValid, getErrorMessage } = require('../../../../lib/validation/utils');
const { RecordResponseIO } = require('../../../../lib/validation/api-responses/record-response');

const EMPTY_RECORD_FIELDS = {
  key: '',
  body: '',
  version: null,
  profile_key: null,
  range_key: null,
  key2: null,
  key3: null,
};

describe('Validation', () => {
  describe('Record Response', () => {
    it('should not fail with valid data', () => {
      [
        { ...EMPTY_RECORD_FIELDS },
        { ...EMPTY_RECORD_FIELDS, version: -100 },
        { ...EMPTY_RECORD_FIELDS, version: 100 },
        { ...EMPTY_RECORD_FIELDS, version: 0 },
      ].map((data) => {
        const result = RecordResponseIO.decode(data);
        return expect(isValid(result))
          .to.equal(true, `${getErrorMessage(result)} with correct record data: ${JSON.stringify(data)}`);
      });
    });

    it('should fail with invalid data', () => {
      [
        '',
        {},
        123,
        { key: 123 },
        { ...EMPTY_RECORD_FIELDS, version: 111.111 },
        { ...EMPTY_RECORD_FIELDS, version: -111.111 },
        { ...EMPTY_RECORD_FIELDS, version: 'aaaa' },
        { ...EMPTY_RECORD_FIELDS, key: undefined },
        { ...EMPTY_RECORD_FIELDS, body: undefined },
        { ...EMPTY_RECORD_FIELDS, version: undefined },
      ].map((data) => expect(isValid(RecordResponseIO.decode(data)))
        .to.equal(false, `is valid with wrong record data: ${JSON.stringify(data)}`));
    });
  });
});
