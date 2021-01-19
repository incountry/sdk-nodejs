const KMS = require('aws-sdk/clients/kms');
const { createStorage } = require('incountry');

const COUNTRY_CODE = 'us';
const CLIENT_ID = 'INCOUNTRY_CLIENT_ID';
const CLIENT_SECRET = 'INCOUNTRY_CLIENT_SECRET';
const ENVIRONMENT_ID = 'INCOUNTRY_ENVIRONMENT_ID';

const AWS_IAM_ACCESS_KEY_ID = 'AWS_IAM_ACCESS_KEY_ID';
const AWS_IAM_SECRET_ACCESS_KEY = 'AWS_IAM_SECRET_ACCESS_KEY';

const AWS_KMS_REGION = 'us-east-1';
// For the details about CMK see https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html#create-symmetric-cmk
const AWS_KMS_MASTER_KEY_ID_ARN = 'AWS_KMS_MASTER_KEY_ID_ARN';
const AWS_KMS_ENCRYPTED_KEY_BASE64 = 'AWS_KMS_ENCRYPTED_KEY_BASE64';

/**
 * Please install AWS SDK before using this example:
 * `npm install aws-sdk --save`
 */

async function run() {
  const kms = new KMS({
    accessKeyId: AWS_IAM_ACCESS_KEY_ID,
    secretAccessKey: AWS_IAM_SECRET_ACCESS_KEY,
    region: AWS_KMS_REGION,
  });

  const CiphertextBlob = Buffer.from(AWS_KMS_ENCRYPTED_KEY_BASE64, 'base64');

  const { Plaintext: decryptedKey } = await kms.decrypt({ CiphertextBlob, KeyId: AWS_KMS_MASTER_KEY_ID_ARN }).promise();

  if (!decryptedKey || !Buffer.isBuffer(decryptedKey)) {
    return;
  }

  const decodedKey = decryptedKey.toString('base64');

  const storageOptions = {
    environmentId: ENVIRONMENT_ID,
    oauth: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    },
    getSecrets: () => ({
      currentVersion: 1,
      secrets: [{
        secret: decodedKey,
        version: 1,
        isKey: true,
      }],
    }),
  };

  const newRecord = {
    recordKey: 'recordKey-testAWSKMSKeys',
    key1: 'key1',
    key2: 'key2',
    key3: 'key3',
    key10: 'key10',
    profileKey: 'profileKey',
    rangeKey1: 125,
    body: JSON.stringify({ test: 'Test AWS KMS keys in Node.js SDK' }),
    serviceKey2: 'Test AWS KMS keys in Node.js SDK',
  };

  const storage = await createStorage(storageOptions);

  await storage.write(COUNTRY_CODE, newRecord);

  await storage.delete(COUNTRY_CODE, newRecord.recordKey);
}

run();
