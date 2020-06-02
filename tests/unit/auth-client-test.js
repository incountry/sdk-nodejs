const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const sinon = require('sinon');
const uuid = require('uuid/v4');
const { OAuthClient } = require('../../lib/auth-client');
const { DEFAULT_POPAPI_HOST } = require('../../lib/api-client');
const { StorageClientError, StorageServerError } = require('../../lib/errors');

const {
  CUSTOM_AUTH_HOST,
  CUSTOM_AUTH_PATH,
  accessTokenResponse,
  nockCustomAuth,
  nockDefaultAuth,
  nockDefaultAuthMultiple,
} = require('../test-helpers/auth-nock');

const { expect, assert } = chai;

describe('AuthClient', () => {
  let ENV_ID;

  beforeEach(() => {
    nock.disableNetConnect();
    ENV_ID = uuid();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('Auth server url', () => {
    it('should use default auth server url by default', async () => {
      const authNock = nockDefaultAuth().reply(200, accessTokenResponse());
      const authClient = new OAuthClient('clientId', 'clientSecret');
      await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
      assert.equal(authNock.isDone(), true, 'Requested token using default url');
    });

    it('should use custom auth server url if specified', async () => {
      const authNock = nockCustomAuth().reply(200, accessTokenResponse());
      const authClient = new OAuthClient('clientId', 'clientSecret', `${CUSTOM_AUTH_HOST}${CUSTOM_AUTH_PATH}`);
      await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
      assert.equal(authNock.isDone(), true, 'Requested token using custom url');
    });
  });

  describe('Access token acquiring', () => {
    let authClient;
    beforeEach(() => {
      authClient = new OAuthClient('clientId', 'clientSecret');
    });

    describe('getToken() should throw an error when called with bad parameters', () => {
      const badHosts = [undefined, null, ''];
      const badEnvIds = [undefined, null, ''];

      badHosts.forEach((host) => {
        it(`getToken() should throw an error when called with host="${host}"`, async () => {
          nockDefaultAuth().reply(200, accessTokenResponse());
          await expect(authClient.getToken(host)).to.be.rejectedWith(StorageClientError, 'Invalid host provided to AuthClient.getToken()');
        });
      });

      badEnvIds.forEach((envId) => {
        it(`getToken() should throw an error when called with envId="${envId}"`, async () => {
          nockDefaultAuth().reply(200, accessTokenResponse());
          await expect(authClient.getToken(DEFAULT_POPAPI_HOST, envId)).to.be.rejectedWith(StorageClientError, 'Invalid envId provided to AuthClient.getToken()');
        });
      });
    });

    it('getToken() should return access_token', async () => {
      nockDefaultAuth().reply(200, accessTokenResponse());
      const accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
      expect(accessToken).to.eq('access_token');
    });

    describe('tokens caching', () => {
      let clock;
      beforeEach(() => {
        nockDefaultAuthMultiple();
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it('getToken() should not request new access_token during its lifetime period', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');
        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        clock.tick(1 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');
      });

      it('getToken() should request new access_token when it is expired', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        clock.tick(2 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token2');
      });

      it('getToken() should request new access_token during its lifetime period if forceRenew is true', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        clock.tick(1 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID, true);
        expect(accessToken).to.eq('access_token2');
      });
    });

    describe('tokens caching for multiple destination hosts', () => {
      const popapiHost2 = 'https://se.api.incountry.io';
      const popapiHost3 = 'https://ae.api.incountry.io';

      let clock;
      beforeEach(() => {
        nockDefaultAuthMultiple(6, 6);
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it('getToken() should request new access_token for each new host', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');
        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        let accessToken2 = await authClient.getToken(popapiHost2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        clock.tick(1 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        accessToken2 = await authClient.getToken(popapiHost2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        const accessToken3 = await authClient.getToken(popapiHost3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');
      });

      it('getToken() should request new access_token for each new host when it is expired', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        let accessToken2 = await authClient.getToken(popapiHost2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        clock.tick(2 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        accessToken2 = await authClient.getToken(popapiHost2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        let accessToken3 = await authClient.getToken(popapiHost3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');

        clock.tick(4 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token4');

        accessToken2 = await authClient.getToken(popapiHost2, ENV_ID);
        expect(accessToken2).to.eq('access_token5');

        accessToken3 = await authClient.getToken(popapiHost3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');

        clock.tick(2 * 1000);

        accessToken3 = await authClient.getToken(popapiHost3, ENV_ID);
        expect(accessToken3).to.eq('access_token6');
      });
    });

    describe('errors handling', () => {
      it('wrong username or password', async () => {
        const invalidClientErr = {
          error: 'invalid_client',
          error_description: 'Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method)',
          status_code: 401,
        };
        nockDefaultAuth().reply(401, invalidClientErr);
        await expect(authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID)).to.be.rejectedWith(StorageServerError, invalidClientErr.error_description);
      });

      it('not found error', async () => {
        nockDefaultAuth().reply(404, { reason: 'not found' });
        await expect(authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID)).to.be.rejectedWith(StorageServerError, 'Request failed with status code 404');
      });

      it('network error', async () => {
        nockDefaultAuth().reply(500);
        await expect(authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID)).to.be.rejectedWith(StorageServerError, 'Request failed with status code 500');
      });

      it('should throw error if token data has wrong format', async () => {
        nockDefaultAuth().reply(200, { aaa: 111 });
        await expect(authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID)).to.be.rejectedWith(StorageServerError, 'AuthClient <TokenData>');
      });
    });
  });
});
