const t = require('io-ts');

/**
* @typedef Logger
* @property {(logLevel: string, message: string, id?: string, timestamp?: string) => boolean} write
*/

const LoggerIO = t.type({ write: t.Function });

/**
 * @typedef StorageOptions
 * @property {string} endpoint
 * @property {Logger} [logger]
 * @property {string} [apiKey]
 * @property {string} [environmentId]
 * @property {boolean} [encrypt]
 * @property {GetSecretCallback} [getSecret]
 * @property {boolean} [normalizeKeys]
 * @property {CountriesCache} [countriesCache]
 */

const StorageOptionsIO = t.intersection([
  t.type({
    endpoint: t.string,
  }),
  t.partial({
    apiKey: t.string,
    environmentId: t.string,
    encrypt: t.boolean,
    normalizeKeys: t.boolean,
    logger: LoggerIO,
    getSecret: t.Function,
    countriesCache: t.unknown,
  }),
], 'StorageOptions');

module.exports = {
  StorageOptionsIO,
};
  