const axios = require('axios');
const Querystring = require('querystring');
const { StorageServerError } = require('./errors');

/**
 * @typedef OAuthClient
 * @property {Promise<string>} getToken
 */

const DEFAULT_AUTH_URL = 'http://localhost:4444/oauth2/token';

const DEFAULT_HEADERS = {
  Accept: 'application/json, application/x-www-form-urlencoded',
  'Content-Type': 'application/x-www-form-urlencoded',
};

const ERROR_RESPONSES = {
  invalid_request: [
    'The request is missing a required parameter, includes an',
    'invalid parameter value, includes a parameter more than',
    'once, or is otherwise malformed.',
  ].join(' '),
  invalid_client: [
    'Client authentication failed (e.g., unknown client, no',
    'client authentication included, or unsupported',
    'authentication method).',
  ].join(' '),
  invalid_grant: [
    'The provided authorization grant (e.g., authorization',
    'code, resource owner credentials) or refresh token is',
    'invalid, expired, revoked, does not match the redirection',
    'URI used in the authorization request, or was issued to',
    'another client.',
  ].join(' '),
  unauthorized_client: [
    'The client is not authorized to request an authorization',
    'code using this method.',
  ].join(' '),
  unsupported_grant_type: [
    'The authorization grant type is not supported by the',
    'authorization server.',
  ].join(' '),
  access_denied: [
    'The resource owner or authorization server denied the request.',
  ].join(' '),
  unsupported_response_type: [
    'The authorization server does not support obtaining',
    'an authorization code using this method.',
  ].join(' '),
  invalid_scope: [
    'The requested scope is invalid, unknown, or malformed.',
  ].join(' '),
  server_error: [
    'The authorization server encountered an unexpected',
    'condition that prevented it from fulfilling the request.',
    '(This error code is needed because a 500 Internal Server',
    'Error HTTP status code cannot be returned to the client',
    'via an HTTP redirect.)',
  ].join(' '),
  temporarily_unavailable: [
    'The authorization server is currently unable to handle',
    'the request due to a temporary overloading or maintenance',
    'of the server.',
  ].join(' '),
};

const getAuthError = (body) => {
  if (!body) {
    return null;
  }

  const message = ERROR_RESPONSES[body.error]
    || body.error_description
    || body.error;

  if (message) {
    return new StorageServerError(message, body, 'EAUTH');
  }
  return null;
};

const makeAuthHeader = (clientId, clientSecret) => {
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${authString}`;
};

const parseTokenData = (tokenData) => {
  const accessToken = tokenData.access_token;
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + Number(tokenData.expires_in));
  return { accessToken, expires };
};

/** @returns {OAuthClient} */
const getApiKeyAuthClient = (apiKey) => ({ getToken: () => apiKey });

/** @implements {OAuthClient} */
class AuthClient {
  constructor(clientId, clientSecret, accessTokenUri = DEFAULT_AUTH_URL) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessTokenUri = accessTokenUri;
    this.token = null;
    this.tokenExpiresAt = null;
  }

  /** @returns {Promise<string>} */
  async getToken() {
    if (new Date() >= this.tokenExpiresAt) {
      const headers = {
        ...DEFAULT_HEADERS,
        Authorization: makeAuthHeader(this.clientId, this.clientSecret),
      };
      const body = { scope: '', grant_type: 'client_credentials' };

      const tokenData = await this.requestToken(this.accessTokenUri, headers, body);
      const { accessToken, expires } = parseTokenData(tokenData);
      this.token = accessToken;
      this.tokenExpiresAt = expires;
    }

    return this.token;
  }

  async requestToken(url, headers, body) {
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

module.exports = {
  AuthClient,
  getApiKeyAuthClient,
};
