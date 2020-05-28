const nock = require('nock');

const DEFAULT_AUTH_HOST = 'http://localhost:4444';
const DEFAULT_AUTH_PATH = '/oauth2/token';
const CUSTOM_AUTH_HOST = 'http://test.example';
const CUSTOM_AUTH_PATH = '/get/token';

const nockDefaultAuth = () => nock(DEFAULT_AUTH_HOST).post(DEFAULT_AUTH_PATH);
const nockCustomAuth = () => nock(CUSTOM_AUTH_HOST).post(CUSTOM_AUTH_PATH);

const accessTokenResponse = (expires_in = 3599, access_token = 'access_token') => ({
  access_token,
  expires_in,
  scope: '',
  token_type: 'bearer',
});

const nockDefaultAuthMultiple = () => {
  let requestCount = 0;
  nockDefaultAuth().times(2).reply(200, () => {
    requestCount += 1;
    return accessTokenResponse(2, `access_token${requestCount}`);
  });
};

module.exports = {
  CUSTOM_AUTH_HOST,
  CUSTOM_AUTH_PATH,
  DEFAULT_AUTH_HOST,
  DEFAULT_AUTH_PATH,
  accessTokenResponse,
  nockCustomAuth,
  nockDefaultAuth,
  nockDefaultAuthMultiple,
};