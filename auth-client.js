const ClientOAuth2 = require('client-oauth2');

/**
 * @typedef OAuthClient
 * @property {Promise<string>} getToken
 */

/** @returns {OAuthClient} */
const getFakeAuthClient = (apiKey) => ({ getToken: () => apiKey });

/** @implements {OAuthClient} */
class AuthClient {
  constructor(clientId, clientSecret) {
    this.token = null;
    this.tokenExpiresAt = null;
    this.authClient = new ClientOAuth2({
      clientId,
      clientSecret,
      accessTokenUri: 'http://localhost:4444/oauth2/token',
    });
  }

  /** @returns {Promise<string>} */
  async getToken() {
    if (new Date() >= this.tokenExpiresAt) {
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
