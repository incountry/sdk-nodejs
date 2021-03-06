import axios from 'axios';
import * as Querystring from 'querystring';
import * as t from 'io-ts';
import { StorageAuthenticationError, StorageConfigValidationError } from './errors';
import { toStorageAuthenticationError, toStorageServerError, isInvalid } from './validation/utils';
import { OAuthEndpoints } from './validation/user-input/storage-options';

const DEFAULT_REGIONAL_AUTH_ENDPOINTS: OAuthEndpoints = {
  apac: 'https://auth-apac.incountry.com/oauth2/token',
  emea: 'https://auth-emea.incountry.com/oauth2/token',
  default: 'https://auth-emea.incountry.com/oauth2/token',
};

const DEFAULT_HEADERS = {
  Accept: 'application/json, application/x-www-form-urlencoded',
  'Content-Type': 'application/x-www-form-urlencoded',
};

const ERROR_RESPONSES: Record<string, string> = {
  invalid_request: 'The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed.',
  invalid_client: 'Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method).',
  invalid_grant: 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.',
  unauthorized_client: 'The client is not authorized to request an authorization code using this method.',
  unsupported_grant_type: 'The authorization grant type is not supported by the authorization server.',
  access_denied: 'The resource owner or authorization server denied the request.',
  unsupported_response_type: 'The authorization server does not support obtaining an authorization code using this method.',
  invalid_scope: 'The requested scope is invalid, unknown, or malformed.',
  server_error: 'The authorization server encountered an unexpected condition that prevented it from fulfilling the request. (This error code is needed because a 500 Internal Server Error HTTP status code cannot be returned to the client via an HTTP redirect.)',
  temporarily_unavailable: 'The authorization server is currently unable to handle the request due to a temporary overloading or maintenance of the server.',
};


const AuthErrorIO = t.intersection([
  t.type({
    error: t.string,
    error_description: t.string,
  }),
  t.partial({
    error_hint: t.string,
    status_code: t.number,
  }),
]);

function getAuthError(body: unknown): StorageAuthenticationError | null {
  const decodedBody = AuthErrorIO.decode(body);
  if (isInvalid(decodedBody)) {
    return null;
  }

  const { error, error_description, error_hint } = decodedBody.right;
  let message = ERROR_RESPONSES[error] || error_description || error;
  message = error_hint ? `${message} ${error_hint}` : message;
  return message ? new StorageAuthenticationError(message, body) : null;
}

const makeAuthHeader = (clientId: string, clientSecret: string): string => {
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${authString}`;
};

const TokenDataIO = t.type({ access_token: t.string, expires_in: t.number }, 'TokenData');
type TokenData = {
  accessToken: string;
  expires: Date;
}

const parseTokenData = (tokenData: unknown): TokenData => {
  const tokenDecoded = TokenDataIO.decode(tokenData);
  if (isInvalid(tokenDecoded)) {
    throw toStorageAuthenticationError('Error validating OAuth server response: ')(tokenDecoded);
  }

  const { access_token: accessToken, expires_in } = tokenDecoded.right;
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + expires_in);
  return { accessToken, expires };
};

interface AuthClient {
  getToken: (audience: string, envId: string, region: string, forceRenew?: boolean) => Promise<string>;
}

const getStaticTokenAuthClient = (token: string): AuthClient => ({
  getToken: () => Promise.resolve(token),
});

class OAuthClient implements AuthClient {
  private tokens: { [key: string]: TokenData | undefined } = {};

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly authEndpoints?: OAuthEndpoints,
  ) {
  }

  async getToken(audience: string, envId: string, region: string, forceRenew = false): Promise<string> {
    if (!audience) {
      throw new StorageAuthenticationError('Invalid audience provided to AuthClient.getToken()');
    }
    if (!envId) {
      throw new StorageConfigValidationError('Invalid envId provided to AuthClient.getToken()');
    }
    if (!region) {
      throw new StorageAuthenticationError('Invalid region provided to AuthClient.getToken()');
    }

    let token = this.tokens[audience];
    if (!token || new Date() >= token.expires || forceRenew) {
      const headers = {
        ...DEFAULT_HEADERS,
        Authorization: makeAuthHeader(this.clientId, this.clientSecret),
      };
      const body = { scope: envId, grant_type: 'client_credentials', audience };
      const authServerUrl = this.getTokenProviderEndpoint(region);
      const tokenData = await this.requestToken(authServerUrl, headers, body);
      token = parseTokenData(tokenData);
      this.tokens[audience] = token;
    }

    return token.accessToken;
  }

  private async requestToken(url: string, headers: {}, body: {}): Promise<unknown> {
    const data = Querystring.stringify(body);

    let res;
    try {
      res = await axios({
        url,
        headers,
        method: 'POST',
        data,
      });
    } catch (e) {
      const authErr = getAuthError(e.response && e.response.data);
      if (authErr) {
        throw authErr;
      }
      throw toStorageServerError('Error obtaining OAuth token: ')(e);
    }

    return res.data;
  }

  private getTokenProviderEndpoint(region: string): string {
    if (this.authEndpoints) {
      return this.authEndpoints[region.toLowerCase()] || this.authEndpoints.default;
    }

    return DEFAULT_REGIONAL_AUTH_ENDPOINTS[region.toLowerCase()] || DEFAULT_REGIONAL_AUTH_ENDPOINTS.default;
  }
}

export {
  AuthClient,
  getStaticTokenAuthClient,
  OAuthClient,
};
