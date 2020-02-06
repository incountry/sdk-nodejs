const chai = require('chai');
chai.use(require('chai-as-promised'));

const nock = require('nock');
const sinon = require('sinon');
const { AuthClient } = require('../../auth-client');
const { StorageServerError } = require('../../errors');

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
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('Auth server url', () => {
    it('should use default auth server url by default', async () => {
      const authNock = nockDefaultAuth().reply(200, accessTokenResponse());
      const authClient = new AuthClient('clientId', 'clientSecret');
      await authClient.getToken();
      assert.equal(authNock.isDone(), true, 'Requested token using default url');
    });

    it('should use custom auth server url if specified', async () => {
      const authNock = nockCustomAuth().reply(200, accessTokenResponse());
      const authClient = new AuthClient('clientId', 'clientSecret', `${CUSTOM_AUTH_HOST}${CUSTOM_AUTH_PATH}`);
      await authClient.getToken();
      assert.equal(authNock.isDone(), true, 'Requested token using custom url');
    });
  });

  describe('Access token acquiring', () => {
    let authClient;
    beforeEach(() => {
      authClient = new AuthClient('clientId', 'clientSecret');
    });

    it('getToken() should return access_token', async () => {
      nockDefaultAuth().reply(200, accessTokenResponse());
      const accessToken = await authClient.getToken();
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
        let accessToken = await authClient.getToken();
        expect(accessToken).to.eq('access_token1');
        accessToken = await authClient.getToken();
        expect(accessToken).to.eq('access_token1');

        clock.tick(1 * 1000);

        accessToken = await authClient.getToken();
        expect(accessToken).to.eq('access_token1');
      });

      it('getToken() should request new access_token when it is expired', async () => {
        let accessToken = await authClient.getToken();
        expect(accessToken).to.eq('access_token1');

        clock.tick(2 * 1000);

        accessToken = await authClient.getToken();
        expect(accessToken).to.eq('access_token2');
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
        await expect(authClient.getToken()).to.be.rejectedWith(StorageServerError, invalidClientErr.error_description);
      });

      it('network error', async () => {
        nockDefaultAuth().reply(500);
        await expect(authClient.getToken()).to.be.rejectedWith(StorageServerError, 'HTTP status 500');
      });
    });
  });
});
