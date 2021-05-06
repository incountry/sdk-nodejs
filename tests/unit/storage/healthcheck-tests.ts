import * as chai from 'chai';
import * as sinon from 'sinon';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { nockPopApi, getNockedRequestHeaders } from '../../test-helpers/popapi-nock';
import {
  COUNTRY,
  POPAPI_HOST,
  popapiResponseHeaders,
  getDefaultStorage,
  noop,
  getLoggerCallMeta,
  sdkVersionRegExp,
  checkLoggerMeta,
} from './common';
import { VALID_REQUEST_OPTIONS, INVALID_REQUEST_OPTIONS } from '../validation/request-options';
import { Storage } from '../../../src/storage';
import { InputValidationError } from '../../../src/errors';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;


describe('Storage', () => {
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  beforeEach(() => {
    clientId = process.env.INC_CLIENT_ID;
    clientSecret = process.env.INC_CLIENT_SECRET;
    delete process.env.INC_CLIENT_ID;
    delete process.env.INC_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env.INC_CLIENT_ID = clientId;
    process.env.INC_CLIENT_SECRET = clientSecret;
  });

  describe('interface methods', () => {
    let encStorage: Storage;

    beforeEach(async () => {
      nock.disableNetConnect();
      encStorage = await getDefaultStorage(true);
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('healthcheck', () => {
      let popAPI: nock.Scope;

      beforeEach(() => {
        popAPI = nockPopApi(POPAPI_HOST).healthcheck().reply(200, '', popapiResponseHeaders);
      });

      describe('arguments validation', () => {
        describe('request options', () => {
          it('should throw error with invalid request options', async () => {
            // @ts-ignore
            await Promise.all(INVALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.healthcheck(COUNTRY, requestOptions))
              .to.be.rejectedWith(InputValidationError, 'healthcheck() Validation Error: <RequestOptionsIO>')));
          });

          it('should not throw error with valid request options', async () => {
            await Promise.all(VALID_REQUEST_OPTIONS.map((requestOptions) => expect(encStorage.healthcheck(COUNTRY, requestOptions))
              .not.to.be.rejectedWith(InputValidationError)));
          });

          it('should not throw error without request options', async () => {
            expect(encStorage.healthcheck(COUNTRY))
              .not.to.be.rejectedWith(InputValidationError);
          });

          it('should pass valid request options "meta" to logger', async () => {
            const meta = { id: 123, test: 'test' };
            const spy = sinon.spy(encStorage.logger, 'write');
            await encStorage.healthcheck(COUNTRY, { meta }).catch(noop);
            expect(spy.args[0][2]).to.deep.include(meta);
            expect(spy.args[1][2]).to.deep.include(meta);
          });
        });
      });

      describe('request headers', () => {
        it('should set User-Agent', async () => {
          const [headers] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.healthcheck(COUNTRY)]);
          const userAgent = headers['user-agent'];
          expect(userAgent).to.match(sdkVersionRegExp);
        });

        it('should set correct custom request headers if provided', async () => {
          const headers = { 'x-inc-test1': 'test' };
          const [reqHeaders] = await Promise.all([getNockedRequestHeaders(popAPI), encStorage.healthcheck(COUNTRY, { headers })]);
          expect(reqHeaders).to.deep.include(headers);
        });
      });

      describe('response headers', () => {
        it('should be provided to logger in meta param', async () => {
          const callMeta = { id: uuid(), test: uuid() };
          const spy = sinon.spy(encStorage.logger, 'write');
          await encStorage.healthcheck(COUNTRY, { meta: callMeta });
          expect(spy.calledWith('info')).to.eq(true);
          const actualMeta = getLoggerCallMeta(spy);
          checkLoggerMeta(actualMeta, callMeta, 'healthcheck');
        });
      });

      describe('normalize country', () => {
        it('it should pass normalized country code', async () => {
          let countryCode = COUNTRY;
          const storage = await getDefaultStorage();

          nockPopApi(POPAPI_HOST).healthcheck().reply(200, 'OK');
          await storage.healthcheck(countryCode);

          countryCode = COUNTRY.charAt(0) + COUNTRY.charAt(1).toUpperCase();

          nockPopApi(POPAPI_HOST).healthcheck().reply(200, 'OK');
          await storage.healthcheck(countryCode);

          countryCode = COUNTRY.charAt(0).toUpperCase() + COUNTRY.charAt(1);

          nockPopApi(POPAPI_HOST).healthcheck().reply(200, 'OK');
          await storage.healthcheck(countryCode);

          nockPopApi(POPAPI_HOST).healthcheck().reply(200, 'OK');
          await storage.healthcheck(COUNTRY.toUpperCase());
        });
      });
    });
  });
});
