const axios = require('axios');
const ClientOAuth2 = require('client-oauth2');

/**
 * @typedef OAuthClient
 * @property {Promise<string>} getToken
 */

const DEFAULT_AUTH_URL = 'http://localhost:4444/oauth2/token';

/** @returns {OAuthClient} */
const getFakeAuthClient = (apiKey) => ({ getToken: () => apiKey });

/** @implements {OAuthClient} */
class AuthClient {
  constructor(clientId, clientSecret, accessTokenUri = DEFAULT_AUTH_URL) {
    const axiosRequest = (method, url, body, headers) => axios({
      url,
      headers,
      method,
      data: body,
    }).then((res) => {
      res.body = JSON.stringify(res.data);
      return res;
    });

    this.token = null;
    this.tokenExpiresAt = null;
    this.authClient = new ClientOAuth2({
      clientId,
      clientSecret,
      accessTokenUri,
    }, axiosRequest);
  }

  /** @returns {Promise<string>} */
  async getToken() {
    if (new Date() >= this.tokenExpiresAt) {
      // TODO: throw custom error
      const { accessToken, expires } = await this.authClient.credentials.getToken();
      this.token = accessToken;
      this.tokenExpiresAt = expires;
    }

    return this.token;
  }
}

module.exports = {
  AuthClient,
  getFakeAuthClient,
};
