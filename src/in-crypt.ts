import crypto from 'crypto';
import util from 'util';
import { SecretKeyAccessor } from './secret-key-accessor';
import { StorageCryptoError } from './errors';
import {
  isValid, getErrorMessage, NonNegativeInt,
} from './validation/utils';
import {
  CustomEncryptionConfigsIO,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
  CustomEncryptionConfig,
} from './validation/custom-encryption-configs';
import { validateCustomEncryption } from './validation/custom-encryption-configs-deep';
import { SecretOrKey, isKey } from './validation/secrets-data';

const pbkdf2 = util.promisify(crypto.pbkdf2);

type Encrypted = {
  message: string;
  secretVersion: NonNegativeInt;
};

type Key = {
  key: Buffer;
  version: NonNegativeInt;
}

const IV_SIZE = 12;
const KEY_SIZE = 32;
const SALT_SIZE = 64;
const PBKDF2_ITERATIONS_COUNT = 10000;
const AUTH_TAG_SIZE = 16;
const VERSION = '2';
const PT_VERSION = 'pt';
const CUSTOM_ENCRYPTION_VERSION_PREFIX = 'c';

const CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA = 'Custom encryption not supported without secretKeyAccessor provided';
const CUSTOM_ENCRYPTION_ERROR_MESSAGE_IS_KEY = 'Key cannot be used for custom encryption';

class InCrypt {
  customEncryption: Record<string, CustomEncryptionConfig> | null = null;
  currentCustomEncryptionVersion: string | null = null; // custom encryption version to use instead of default encryption

  constructor(readonly secretKeyAccessor?: SecretKeyAccessor) {}

  async validate(): Promise<void> {
    if (this.secretKeyAccessor !== undefined) {
      await this.secretKeyAccessor.validate();
    }

    if (this.customEncryption !== null) {
      if (this.secretKeyAccessor === undefined) {
        throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA);
      }
      const secretData = await this.secretKeyAccessor.getSecrets();
      await validateCustomEncryption(secretData, Object.values(this.customEncryption));
    }
  }

  private packCustomEncryptionVersion(version: string): string {
    return `${CUSTOM_ENCRYPTION_VERSION_PREFIX}${Buffer.from(version).toString('base64')}`;
  }

  setCustomEncryption(customEncryptionConfigs: CustomEncryptionConfig[]): void{
    if (this.secretKeyAccessor === undefined) {
      throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA);
    }

    const validationResult = CustomEncryptionConfigsIO.decode(customEncryptionConfigs);
    if (!isValid(validationResult)) {
      const errorMessage = getErrorMessage(validationResult);
      throw new StorageCryptoError(`Custom Encryption Validation Error: ${errorMessage}`);
    }

    this.customEncryption = customEncryptionConfigs.reduce((result, item) => ({
      ...result,
      [this.packCustomEncryptionVersion(item.version)]: item,
    }), {});

    const current = customEncryptionConfigs.find((c) => c.isCurrent);
    if (current) {
      this.currentCustomEncryptionVersion = this.packCustomEncryptionVersion(current.version);
    }
  }

  async getCurrentSecretVersion(): Promise<number> {
    if (!this.secretKeyAccessor) {
      throw new StorageCryptoError('No secretKeyAccessor provided. Cannot get secret version');
    }
    const { version } = await this.secretKeyAccessor.getSecret();
    return version;
  }

  async encrypt(text: string): Promise<Encrypted> {
    if (this.secretKeyAccessor === undefined) {
      return {
        message: `${PT_VERSION}:${Buffer.from(text).toString('base64')}`,
        secretVersion: SecretKeyAccessor.DEFAULT_VERSION,
      };
    }

    const secretData = await this.secretKeyAccessor.getSecret();

    if (this.customEncryption && this.currentCustomEncryptionVersion) {
      const config = this.customEncryption[this.currentCustomEncryptionVersion];
      if (config) {
        return this.encryptCustom(text, config.encrypt, secretData);
      }
    }

    return this.encryptDefault(text, secretData);
  }

  private async encryptCustom(text: string, encrypt: CustomEncryptionConfig['encrypt'], secretData: SecretOrKey): Promise<Encrypted> {
    if (isKey(secretData)) {
      throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_IS_KEY);
    }

    const { secret, version: secretVersion, isForCustomEncryption } = secretData;
    if (!isForCustomEncryption) {
      throw new StorageCryptoError(`Secret with version ${secretVersion} is not marked for custom encryption`);
    }

    let ciphertext;
    try {
      ciphertext = await encrypt(text, secret, secretVersion);
    } catch (e) {
      throw new StorageCryptoError(`Error calling custom encryption "encrypt" method [Secret version: ${secretData.version}]: ${e.message}`, e);
    }

    if (typeof ciphertext !== 'string') {
      throw new StorageCryptoError(`${CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC}. Got ${typeof ciphertext}`);
    }

    return {
      message: `${this.currentCustomEncryptionVersion}:${ciphertext}`,
      secretVersion,
    };
  }

  private async encryptDefault(text: string, secretData: SecretOrKey): Promise<Encrypted> {
    const iv = crypto.randomBytes(IV_SIZE);
    const salt = crypto.randomBytes(SALT_SIZE);
    const { key, version } = await this.getEncryptionKey(salt, secretData);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ciphertext = Buffer.concat([salt, iv, encrypted, tag]).toString('base64');
    return {
      message: `${VERSION}:${ciphertext}`,
      secretVersion: version,
    };
  }

  async decrypt(s: string, secretVersion?: number): Promise<string> {
    const parts = s.split(':');
    if (parts.length !== 2) {
      throw new StorageCryptoError('Invalid ciphertext');
    }
    const [version, encrypted] = parts;

    if (version === PT_VERSION) {
      return this.decryptVpt(encrypted);
    }

    if (!this.secretKeyAccessor) {
      throw new StorageCryptoError('No secretKeyAccessor provided. Cannot decrypt encrypted data');
    }
    const secretData = await this.secretKeyAccessor.getSecret(secretVersion);

    if (version === '1') {
      return this.decryptV1(encrypted, secretData);
    }

    if (version === '2') {
      return this.decryptV2(encrypted, secretData);
    }

    if (this.customEncryption) {
      const config = this.customEncryption[version];
      if (config) {
        return this.decryptCustom(encrypted, config.decrypt, secretData);
      }
    }

    throw new StorageCryptoError('Unknown decryptor version requested');
  }


  private decryptVpt(plainTextBase64: string): string {
    return Buffer.from(plainTextBase64, 'base64').toString('utf-8');
  }

  private async decryptV2(encryptedBase64: string, secretData: SecretOrKey): Promise<string> {
    const bData = Buffer.from(encryptedBase64, 'base64');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const { key } = await this.getEncryptionKey(salt, secretData);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  private async decryptV1(encryptedHex: string, secretData: SecretOrKey): Promise<string> {
    const bData = Buffer.from(encryptedHex, 'hex');

    const salt = bData.slice(0, SALT_SIZE);
    const iv = bData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = bData.slice(SALT_SIZE + IV_SIZE, bData.length - AUTH_TAG_SIZE);
    const tag = bData.slice(-AUTH_TAG_SIZE);

    const { key } = await this.getEncryptionKey(salt, secretData);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
  }

  private async decryptCustom(encrypted: string, decrypt: CustomEncryptionConfig['decrypt'], secretData: SecretOrKey): Promise<string> {
    if (isKey(secretData)) {
      throw new StorageCryptoError(CUSTOM_ENCRYPTION_ERROR_MESSAGE_IS_KEY);
    }

    const { secret, isForCustomEncryption, version: secretVersion } = secretData;
    if (!isForCustomEncryption) {
      throw new StorageCryptoError(`Secret with version ${secretVersion} is not marked for custom encryption`);
    }

    let decrypted;
    try {
      decrypted = await decrypt(encrypted, secret, secretVersion);
    } catch (e) {
      throw new StorageCryptoError(`Error calling custom encryption "decrypt" method [Secret version: ${secretData.version}]: ${e.message}`, e);
    }

    if (typeof decrypted !== 'string') {
      throw new StorageCryptoError(`${CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC}. Got ${typeof decrypted}`);
    }
    return decrypted;
  }

  private async getEncryptionKey(salt: Buffer, secretData: SecretOrKey): Promise<Key> {
    const { version } = secretData;
    const key = isKey(secretData) ? secretData.secret : (await pbkdf2(secretData.secret, salt, PBKDF2_ITERATIONS_COUNT, KEY_SIZE, 'sha512'));
    return { key, version };
  }
}

export {
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_ENC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_DEC,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_NO_SKA,
  CUSTOM_ENCRYPTION_ERROR_MESSAGE_IS_KEY,
  KEY_SIZE,
  VERSION,
  CUSTOM_ENCRYPTION_VERSION_PREFIX,
  InCrypt,
};
