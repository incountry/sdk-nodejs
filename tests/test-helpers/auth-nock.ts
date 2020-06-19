import nock from 'nock';

const DEFAULT_AUTH_HOST = 'https://auth.incountry.com';
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

const nockDefaultAuthMultiple = (times = 2, tokenTtl = 2) => {
  let requestCount = 0;
  nockDefaultAuth().times(times).reply(200, () => {
    requestCount += 1;
    return accessTokenResponse(tokenTtl, `access_token${requestCount}`);
  });
};

export {
  CUSTOM_AUTH_HOST,
  CUSTOM_AUTH_PATH,
  DEFAULT_AUTH_HOST,
  DEFAULT_AUTH_PATH,
  accessTokenResponse,
  nockCustomAuth,
  nockDefaultAuth,
  nockDefaultAuthMultiple,
};
