import { validationToPromise, toStorageClientError, NonNegativeInt } from './validation/utils';
import { SecretsDataIO, SecretsData, SecretOrKey } from './validation/secrets-data';
import { StorageClientError } from './errors';

const DEFAULT_VERSION = 0 as NonNegativeInt;

function wrapToSecretsData(secret: string): SecretsData {
  return {
    currentVersion: DEFAULT_VERSION,
    secrets: [{
      secret,
      version: DEFAULT_VERSION,
    }],
  };
}

type GetSecretsCallback = () => string | SecretsData | Promise<string> | Promise<SecretsData>;

class SecretKeyAccessor {
  static DEFAULT_VERSION = DEFAULT_VERSION;
  getSecretsCallback: Function;

  constructor(getSecretsCallback: Function) {
    if (typeof getSecretsCallback !== 'function') {
      throw new StorageClientError('Provide callback function for secretData');
    }
    this.getSecretsCallback = getSecretsCallback;
  }

  async validate(): Promise<void> {
    await this.getSecret();
  }

  async getSecret(secretVersion?: number): Promise<SecretOrKey> {
    const secretData = await this.getSecrets();
    const version = secretVersion !== undefined ? secretVersion : secretData.currentVersion;
    const secret = secretData.secrets.find((s) => s.version === version);
    if (!secret) {
      throw new StorageClientError(`Secret not found for version ${secretVersion}`);
    }
    return secret;
  }

  async getSecrets(): Promise<SecretsData> {
    const secretData = await Promise.resolve<unknown>(this.getSecretsCallback());
    if (typeof secretData === 'string') {
      return wrapToSecretsData(secretData);
    }

    return validationToPromise(SecretsDataIO.decode(secretData), toStorageClientError());
  }
}

export {
  GetSecretsCallback,
  SecretKeyAccessor,
};
