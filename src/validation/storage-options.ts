import * as t from 'io-ts';
import { Override } from '../utils';
import { CountriesCache } from '../countries-cache';
import { Logger, LoggerIO } from './logger';
import { NonNegativeInt, Codec } from './utils';
import { exact } from './exact';

const OAUTH_ENDPOINTS_ERROR_MESSAGE = 'authEndpoints should be an object containing "default" key';
const OAUTH_ENDPOINTS_VALUES_ERROR_MESSAGE = 'authEndpoints values should be a string';

type OAuthEndpoints = {
  default: string;
  [key: string]: string;
};

type OAuthCredentials = {
  clientId?: string;
  clientSecret?: string;
  authEndpoints?: OAuthEndpoints;
};

type OAuthToken = {
  token: string;
};

type OAuthOptions = OAuthCredentials | OAuthToken;

const OAuthEndpointsIO: t.Type<OAuthEndpoints> = new t.Type(
  'OAuthEndpoints',
  (u): u is OAuthEndpoints => t.UnknownRecord.is(u)
    && Object.keys(u).map((k) => k.toLowerCase()).includes('default')
    && Object.values(u).reduce((acc: boolean, v: unknown) => acc && t.string.is(v), true),
  (u, c) => {
    if (!t.UnknownRecord.is(u)) {
      return t.failure(u, c, OAUTH_ENDPOINTS_ERROR_MESSAGE);
    }

    const lowerCasedAuthEndpoints: Record<string, string> = {};
    const keys = Object.keys(u);
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const value = (u as Record<string, unknown>)[k];
      if (!t.string.is(value)) {
        return t.failure(u, c, OAUTH_ENDPOINTS_VALUES_ERROR_MESSAGE);
      }

      lowerCasedAuthEndpoints[k.toLowerCase()] = value;
    }

    if (!Object.keys(lowerCasedAuthEndpoints).includes('default')) {
      return t.failure(u, c, OAUTH_ENDPOINTS_ERROR_MESSAGE);
    }

    return t.success(lowerCasedAuthEndpoints as OAuthEndpoints);
  },
  Object,
);

const OAuthCredentialsIO: t.Type<OAuthCredentials> = exact(t.partial({
  clientId: t.string,
  clientSecret: t.string,
  authEndpoints: OAuthEndpointsIO,
}, 'OAuthCredentials'));

const OAuthTokenIO: t.Type<OAuthToken> = exact(t.type({
  token: t.string,
}, 'OAuthToken'));

const OAuthOptionsIO: t.Type<OAuthOptions> = t.union([OAuthTokenIO, OAuthCredentialsIO], 'OAuthOptions');

type StorageOptions = {
  endpoint?: string;
  logger?: Logger;
  apiKey?: string;
  environmentId?: string;
  encrypt?: boolean;
  getSecrets?: Function;
  normalizeKeys?: boolean;
  hashSearchKeys?: boolean;
  countriesCache?: CountriesCache;
  oauth?: OAuthOptions;
  endpointMask?: string;
  countriesEndpoint?: string;
  httpOptions?: {
    timeout?: NonNegativeInt;
  };
};

type StorageOptionsValidated = Override<StorageOptions, {
  logger?: { write: Function };
  countriesCache?: CountriesCache;
}>;

const isCountriesCache = (o: unknown): o is CountriesCache => o instanceof CountriesCache;

const CountriesCacheIO = new t.Type<CountriesCache>(
  'CountriesCache',
  isCountriesCache,
  (o, c) => isCountriesCache(o) ? t.success(o) : t.failure(o, c),
  t.identity,
);

const StorageOptionsIO: Codec<StorageOptionsValidated> = t.partial({
  endpoint: t.string,
  apiKey: t.string,
  environmentId: t.string,
  encrypt: t.boolean,
  normalizeKeys: t.boolean,
  logger: LoggerIO,
  getSecrets: t.Function,
  hashSearchKeys: t.boolean,
  countriesCache: CountriesCacheIO,
  oauth: OAuthOptionsIO,
  endpointMask: t.string,
  countriesEndpoint: t.string,
  httpOptions: t.partial({
    timeout: NonNegativeInt,
  }),
}, 'StorageOptions');

export {
  OAuthEndpoints,
  OAuthEndpointsIO,
  OAuthOptions,
  OAuthOptionsIO,
  StorageOptions,
  StorageOptionsIO,
};
