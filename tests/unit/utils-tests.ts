import * as chai from 'chai';

import {
  isJSON,
  omitNulls,
  getFileNameFromHeaders,
} from '../../src/utils';

const { expect } = chai;

describe('Utils', () => {
  describe('isJSON', () => {
    it('should return true if argument is valid JSON string', () => {
      expect(isJSON('{"a": 1}')).to.equal(true);
    });

    it('should return false if argument is not valid JSON string', () => {
      expect(isJSON('{"')).to.equal(false);
    });
  });

  describe('omitNulls', () => {
    it('should remove properties with value "null" from object', () => {
      expect(omitNulls({
        a: 0,
        b: '',
        c: undefined,
        d: null,
        e: false,
      })).to.deep.equal({
        a: 0,
        b: '',
        c: undefined,
        e: false,
      });
    });
  });

  describe('getFileNameFromHeaders', () => {
    it('should return null for wrong headers object', () => {
      [
        {},
        { 'content-disposition': 'attachment; filename-filename.jpg' },
        { 'content-disposition': 'attachment; filename123="filename.jpg"' },
        { 'content-disposition': 'attachment; filename="filename.jpg' },
      ].forEach((s) => {
        expect(getFileNameFromHeaders(s)).to.equal(null);
      });
    });

    it('should return file name for right headers object', () => {
      const fileName = 'filename.jpg';
      [
        { 'content-disposition': `attachment; filename*=UTF-8''${fileName}` },
        { 'content-disposition': `attachment; filename*=UTF-8''${fileName};` },
        { 'content-disposition': `attachment; filename*=UTF-8''${fileName}; bar=baz` },
        { 'content-disposition': `attachment; filename*=UTF-8''${fileName}; bar=baz;` },
      ].forEach((s) => {
        expect(getFileNameFromHeaders(s)).to.equal(fileName);
      });
    });

    it('should return decoded unicode file name', () => {
      const fileName = 'Naïve file.txt';
      const headers = { 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)};` };
      expect(getFileNameFromHeaders(headers)).to.equal(fileName);
    });
  });
});
