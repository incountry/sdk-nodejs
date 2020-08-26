const { createStorage } = require('incountry');

const COUNTRY_CODE = 'us';
const API_KEY = 'API_KEY';
const ENVIRONMENT_ID = 'ENVIRONMENT_ID';
const LIMIT = 50;

const getSecrets = () => ({
  currentVersion: 1,
  secrets: [
    { secret: 'password0', version: 0 },
    { secret: 'password1', version: 1 },
  ],
});

async function migrate() {
  const storage = await createStorage({
    apiKey: API_KEY,
    environmentId: ENVIRONMENT_ID,
    getSecrets,
  });

  let migrationComplete = false;
  while (!migrationComplete) {
    const res = await storage.migrate(COUNTRY_CODE, LIMIT);
    if (res.totalLeft === 0) {
      migrationComplete = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

migrate();
