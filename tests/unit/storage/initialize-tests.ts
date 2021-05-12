import * as chai from 'chai';
import { identity } from 'fp-ts/lib/function';
import { POPAPI_HOST, LOGGER_STUB } from './common';
import { StorageConfigValidationError, StorageCryptoError } from '../../../src/errors';
import {
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT,
  CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS,
} from '../../../src/validation/user-input/custom-encryption-configs';
import { createStorage } from '../../../src/storage';
import { errorMessageRegExp } from '../../test-helpers/utils';

const { expect } = chai;

describe('Storage', () => {
  describe('interface methods', () => {
    describe('initialize', () => {
      it('should throw an error when setting custom encryption configs with disabled encryption', async () => {
        const options = {
          environmentId: 'string',
          oauth: { clientId: 'clientId', clientSecret: 'clientSecret' },
          endpoint: POPAPI_HOST,
          encrypt: false,
          logger: LOGGER_STUB(),
        };

        const customEncryptionConfigs = [{ encrypt: () => { }, decrypt: () => { }, version: '' }];

        // @ts-ignore
        await expect(createStorage(options, customEncryptionConfigs))
          .to.be.rejectedWith(StorageConfigValidationError, 'Cannot use custom encryption when encryption is off');
      });

      it('should throw an error if configs object is malformed', () => Promise.all(['', {}, () => { }]
        .map(async (configs) => {
          const options = {
            environmentId: 'string',
            oauth: { clientId: 'clientId', clientSecret: 'clientSecret' },
            endpoint: POPAPI_HOST,
            logger: LOGGER_STUB(),
            getSecrets: () => '',
          };

          // @ts-ignore
          await expect(createStorage(options, configs), `with ${JSON.stringify(configs)}`)
            .to.be.rejectedWith(StorageCryptoError, errorMessageRegExp('Custom Encryption Validation Error:', CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_ARRAY));
        })));

      it('should throw an error if 2 configs are marked as current', async () => {
        const configs = [{
          encrypt: identity, decrypt: identity, isCurrent: true, version: '1',
        }, {
          encrypt: identity, decrypt: identity, isCurrent: true, version: '2',
        }];

        const options = {
          environmentId: 'string',
          oauth: { clientId: 'clientId', clientSecret: 'clientSecret' },
          endpoint: POPAPI_HOST,
          logger: LOGGER_STUB(),
          getSecrets: () => '',
        };

        // @ts-ignore
        await expect(createStorage(options, configs))
          .to.be.rejectedWith(StorageCryptoError, errorMessageRegExp('Custom Encryption Validation Error:', CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_CURRENT));
      });

      it('should throw an error if 2 configs have same version', async () => {
        const configs = [{
          encrypt: identity, decrypt: identity, version: '1',
        }, {
          encrypt: identity, decrypt: identity, isCurrent: true, version: '1',
        }];

        const options = {
          environmentId: 'string',
          oauth: { clientId: 'clientId', clientSecret: 'clientSecret' },
          endpoint: POPAPI_HOST,
          logger: LOGGER_STUB(),
          getSecrets: () => '',
        };

        // @ts-ignore
        await expect(createStorage(options, configs))
          .to.be.rejectedWith(StorageCryptoError, errorMessageRegExp('Custom Encryption Validation Error:', CUSTOM_ENCRYPTION_CONFIG_ERROR_MESSAGE_VERSIONS));
      });
    });
  });
});
