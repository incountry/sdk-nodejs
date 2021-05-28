import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createStorage, COUNTRY } from './common';
import { Storage } from '../../src';

chai.use(chaiAsPromised);
const { expect } = chai;

let storage: Storage;

describe('Check Storage health', () => {
  beforeEach(async () => {
    storage = await createStorage({ encryption: true });
  });

  it('Healthcheck should pass', async () => {
    const { result } = await storage.healthcheck(COUNTRY);
    expect(result).to.equal(true);
  });
});
