import * as t from 'io-ts';
import { Override } from '../utils';
import { CountriesCache } from '../countries-cache';
import { Logger, LoggerIO } from './logger';

type OAuthOptions = {
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
};

const OAuthOptionsIO: t.Type<OAuthOptions> = t.partial({
  clientId: t.string,
  clientSecret: t.string,
  authUrl: t.string,
}, 'OAuthOptions');

type StorageOptions = {
  endpoint?: string;
  logger?: Logger;
  apiKey?: string;
  environmentId?: string;
  encrypt?: boolean;
  getSecrets?: Function;
  normalizeKeys?: boolean;
  countriesCache?: CountriesCache;
  oauth?: OAuthOptions;
  endpointMask?: string;
  countriesEndpoint?: string;
};

type StorageOptionsValidated = Override<StorageOptions, {
  logger?: { write: Function };
  countriesCache?: {};
}>;

const StorageOptionsIO: t.Type<StorageOptionsValidated> = t.partial({
  endpoint: t.string,
  apiKey: t.string,
  environmentId: t.string,
  encrypt: t.boolean,
  normalizeKeys: t.boolean,
  logger: LoggerIO,
  getSecrets: t.Function,
  countriesCache: t.object,
  oauth: OAuthOptionsIO,
  endpointMask: t.string,
  countriesEndpoint: t.string,
}, 'StorageOptions');

export {
  OAuthOptions,
  StorageOptions,
  StorageOptionsIO,
};
