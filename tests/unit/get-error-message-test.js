const chai = require('chai');
const t = require('io-ts');
const { getErrorMessage } = require('../../lib/validation/get-error-message');

const { expect } = chai;

describe('Error reporter', () => {
  describe('simple types', () => {
    it('should convert validation to human readable error message', () => {
      expect(getErrorMessage(t.string.decode(123))).to.eq('<string> should be string but got 123');
    });
  });

  describe('union types', () => {
    it('should convert validation to human readable error message', () => {
      const unionType = t.union([t.string, t.undefined]);
      expect(getErrorMessage(unionType.decode(123))).to.eq('<(string | undefined)> should be (string | undefined) but got 123');

      const unionTypeWithName = t.union([t.string, t.undefined], 'TestUnion');
      expect(getErrorMessage(unionTypeWithName.decode(123))).to.eq('<TestUnion> should be TestUnion but got 123');
    });
  });

  describe('intersection types', () => {
    it('should convert validation to human readable error message', () => {
      const intersectionType = t.intersection([t.string, t.number]);
      expect(getErrorMessage(intersectionType.decode(123))).to.eq('<(string & number)> should be (string & number) but got 123');

      const intersectionTypeWithName = t.intersection([t.type({ a: t.string }), t.type({ b: t.number })], 'TestIntersection2');
      expect(getErrorMessage(intersectionTypeWithName.decode({ a: 123 }))).to.eq('<TestIntersection2>.b should be number but got undefined');
    });
  });

  describe('complex types', () => {
    it('should convert validation to human readable error message', () => {
      const RecordIO = t.intersection([
        t.type({
          key: t.string,
        }),
        t.partial({
          body: t.union([t.string, t.null]),
        }),
      ], 'Record');

      expect(getErrorMessage(RecordIO.decode(123))).to.eq('<Record> should be Record but got 123');
      expect(getErrorMessage(RecordIO.decode({}))).to.eq('<Record>.key should be string but got undefined');
      expect(getErrorMessage(RecordIO.decode({ key: 123 }))).to.eq('<Record>.key should be string but got 123');
      expect(getErrorMessage(RecordIO.decode({ key: 123, body: {} }))).to.eq('<Record>.body should be (string | null) but got {}');
    });
  });
});
