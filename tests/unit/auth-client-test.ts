import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as nock from 'nock';
import * as sinon from 'sinon';
import { v4 as uuid } from 'uuid';
import { OAuthClient } from '../../src/auth-client';
import { StorageClientError, StorageServerError } from '../../src/errors';
import {
  CUSTOM_AUTH_HOST,
  CUSTOM_AUTH_PATH,
  accessTokenResponse,
  nockCustomAuth,
  nockDefaultAuth,
  nockDefaultAuthMultiple,
} from '../test-helpers/auth-nock';

chai.use(chaiAsPromised);
const { expect, assert } = chai;


const DEFAULT_POPAPI_HOST = 'https://us.api.incountry.io';

describe('AuthClient', () => {
  let ENV_ID: string;

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
    let authClient: OAuthClient;
    beforeEach(() => {
      authClient = new OAuthClient('clientId', 'clientSecret');
    });

    describe('getToken() should throw an error when called with bad parameters', () => {
      const badAudiences = [undefined, null, ''];
      const badEnvIds = [undefined, null, ''];

      badAudiences.forEach((audience) => {
        it(`getToken() should throw an error when called with audience="${audience}"`, async () => {
          nockDefaultAuth().reply(200, accessTokenResponse());
          // @ts-ignore
          await expect(authClient.getToken(audience)).to.be.rejectedWith(StorageClientError, 'Invalid audience provided to AuthClient.getToken()');
        });
      });

      badEnvIds.forEach((envId) => {
        it(`getToken() should throw an error when called with envId="${envId}"`, async () => {
          nockDefaultAuth().reply(200, accessTokenResponse());
          // @ts-ignore
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
      let clock: sinon.SinonFakeTimers;
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

    describe('tokens caching for multiple destination audiences', () => {
      const popapiAudience2 = 'https://se.api.incountry.io';
      const popapiAudience3 = 'https://ae.api.incountry.io';
      const popapiAudience4 = 'https://us.api.incountry.io https://es.api.incountry.io';

      let clock: sinon.SinonFakeTimers;
      beforeEach(() => {
        nockDefaultAuthMultiple(6, 6);
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it('getToken() should request new access_token for each new audience', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');
        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        let accessToken2 = await authClient.getToken(popapiAudience2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        clock.tick(1 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        accessToken2 = await authClient.getToken(popapiAudience2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        const accessToken3 = await authClient.getToken(popapiAudience3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');

        const accessToken4 = await authClient.getToken(popapiAudience4, ENV_ID);
        expect(accessToken4).to.eq('access_token4');
      });

      it('getToken() should request new access_token for each new audience when it is expired', async () => {
        let accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        let accessToken2 = await authClient.getToken(popapiAudience2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        clock.tick(2 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token1');

        accessToken2 = await authClient.getToken(popapiAudience2, ENV_ID);
        expect(accessToken2).to.eq('access_token2');

        let accessToken3 = await authClient.getToken(popapiAudience3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');

        clock.tick(4 * 1000);

        accessToken = await authClient.getToken(DEFAULT_POPAPI_HOST, ENV_ID);
        expect(accessToken).to.eq('access_token4');

        accessToken2 = await authClient.getToken(popapiAudience2, ENV_ID);
        expect(accessToken2).to.eq('access_token5');

        accessToken3 = await authClient.getToken(popapiAudience3, ENV_ID);
        expect(accessToken3).to.eq('access_token3');

        clock.tick(2 * 1000);

        accessToken3 = await authClient.getToken(popapiAudience3, ENV_ID);
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
