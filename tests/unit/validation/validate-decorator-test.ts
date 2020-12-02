/* eslint max-classes-per-file: "off" */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as t from 'io-ts';

import { InputValidationError } from '../../../src/errors';
import { validate } from '../../../src/validation/validate-decorator';

chai.use(chaiAsPromised);
const { expect, assert } = chai;

class A {
  @validate(t.string, t.number)
  syncMethod(a: string, b: number) {
    assert.equal(typeof a, 'string', 'a should be string');
    assert.equal(typeof b, 'number', 'b should be number');
  }

  @validate(t.string, t.number)
  async asyncMethod(a: string, b: number) {
    assert.equal(typeof a, 'string', 'a should be string');
    assert.equal(typeof b, 'number', 'b should be number');
  }
}

describe('Validate arguments decorator', () => {
  it('should not throw error for valid arguments', async () => {
    const a = new A();

    expect(a.syncMethod('', 1)).to.not.throw;
    await expect(a.asyncMethod('', 1)).to.not.be.rejected;
  });

  it('should throw error for invalid arguments', async () => {
    const a = new A();

    return Promise.all([
      [1, ''],
      ['', ''],
      [1, 1],
      [],
      [1],
      [undefined, 1],
    ].map(async (args) => {
      // @ts-ignore
      expect(() => a.syncMethod(...args))
        .to.throw(InputValidationError, 'Validation Error', `sync method with ${JSON.stringify(args)}`);

      // @ts-ignore
      await expect(a.asyncMethod(...args))
        .to.be.rejectedWith(InputValidationError, 'Validation Error', `async method with ${JSON.stringify(args)}`);
    }));
  });
});
