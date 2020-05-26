import axios from 'axios';
import Querystring from 'querystring';
import * as t from 'io-ts';
import { StorageClientError, StorageServerError } from './errors';
import { toStorageServerError, isInvalid } from './validation/utils';

const DEFAULT_AUTH_URL = 'http://localhost:4444/oauth2/token';

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


const AuthErrorIO = t.partial({
  error: t.string,
  error_description: t.string,
});

function getAuthError(body: unknown): StorageServerError | null {
  if (!AuthErrorIO.is(body)) {
    return null;
  }

  const { error = '', error_description } = body;
  const message = ERROR_RESPONSES[error] || error_description || error;
  return message ? new StorageServerError(message, body, 'EAUTH') : null;
}

const makeAuthHeader = (clientId: string, clientSecret: string) => {
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${authString}`;
};

const TokenDataIO = t.type({ access_token: t.string, expires_in: t.number });
type TokenData = {
  accessToken: string;
  expires: Date;
}

const parseTokenData = (tokenData: unknown): TokenData => {
  const tokenDecoded = TokenDataIO.decode(tokenData);
  if (isInvalid(tokenDecoded)) {
    throw toStorageServerError('AuthClient')(tokenDecoded);
  }

  const { access_token: accessToken, expires_in } = tokenDecoded.right;
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + expires_in);
  return { accessToken, expires };
};

interface AuthClient {
  getToken: (host: string, envId: string, forceRenew?: boolean) => Promise<string>;
}

const getApiKeyAuthClient = (apiKey: string): AuthClient => ({
  getToken: () => Promise.resolve(apiKey),
});

class OAuthClient implements AuthClient {
  private tokens: { [key: string]: TokenData } = {};

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly accessTokenUri = DEFAULT_AUTH_URL,
  ) {
  }

  async getToken(host: string, envId: string, forceRenew = false): Promise<string> {
    if (!host) {
      throw new StorageClientError('Invalid host provided to AuthClient.getToken()');
    }
    if (!envId) {
      throw new StorageClientError('Invalid envId provided to AuthClient.getToken()');
    }
    const token = this.tokens[host];

    if (!token || new Date() >= token.expires || forceRenew) {
      const headers = {
        ...DEFAULT_HEADERS,
        Authorization: makeAuthHeader(this.clientId, this.clientSecret),
      };
      const body = { scope: envId, grant_type: 'client_credentials', audience: host };

      const tokenData = await this.requestToken(this.accessTokenUri, headers, body);
      this.tokens[host] = parseTokenData(tokenData);
    }

    return this.tokens[host] ? this.tokens[host].accessToken : Promise.reject();
  }

  private async requestToken(url: string, headers: {}, body: {}) {
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
      throw new StorageServerError(e.message, e.data, e.code);
    }

    return res.data;
  }
}

export {
  AuthClient,
  getApiKeyAuthClient,
  OAuthClient,
};
