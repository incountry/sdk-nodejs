/* eslint no-await-in-loop: "off" */

const Storage = require('../storage');
const SecretKeyAccessor = require('../secret-key-accessor');

const COUNTRY = 'us';
const API_KEY = 'API_KEY';
const ENVIRONMENT_ID = 'ENVIRONMENT_ID';

const secretKeyAccessor = new SecretKeyAccessor(() => ({
  currentVersion: 1,
  secrets: [
    { secret: 'password0', version: 0 },
    { secret: 'password1', version: 1 },
  ],
}));

const storage = new Storage(
  {
    apiKey: API_KEY,
    environmentId: ENVIRONMENT_ID,
    encrypt: true,
  },
  secretKeyAccessor,
);

async function migrate() {
  let migrationComplete = false;
  while (!migrationComplete) {
    const res = await storage.migrate(COUNTRY, 50);
    if (res.totalLeft === 0) {
      migrationComplete = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

migrate();
