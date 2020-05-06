const t = require('io-ts');

/**
* @typedef Logger
* @property {(logLevel: string, message: string, id?: string, timestamp?: string) => boolean} write
*/

const LoggerIO = t.type({ write: t.Function }, 'Logger');

/**
* @typedef OAuthOptions
* @property {string} [clientId]
* @property {string} [clientSecret]
* @property {string} [authUrl]
*/

const OAuthOptionsIO = t.partial({
  clientId: t.string,
  clientSecret: t.string,
  authUrl: t.string,
}, 'OAuthOptions');

/**
 * @typedef StorageOptions
 * @property {string} endpoint
 * @property {Logger} [logger]
 * @property {string} [apiKey]
 * @property {string} [environmentId]
 * @property {boolean} [encrypt]
 * @property {GetSecretsCallback} [getSecrets]
 * @property {boolean} [normalizeKeys]
 * @property {CountriesCache} [countriesCache]
 * @property {OAuthOptions} [oauth]
 */

const StorageOptionsIO = t.intersection([
  t.partial({
    endpoint: t.string,
    apiKey: t.string,
    environmentId: t.string,
    encrypt: t.boolean,
    normalizeKeys: t.boolean,
    logger: LoggerIO,
    getSecrets: t.Function,
    countriesCache: t.unknown,
    oauth: OAuthOptionsIO,
  }),
], 'StorageOptions');

module.exports = {
  StorageOptionsIO,
  LoggerIO,
};
