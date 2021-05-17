import * as chai from 'chai';
import * as sinon from 'sinon';
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
import {
  InputValidationError,
  StorageNetworkError,
  StorageConfigValidationError,
  StorageAuthenticationError,
} from '../../../src/errors';

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
      describe('when POPAPI is healthy', () => {
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

      describe('errors handling', () => {
        const REQUEST_TIMEOUT_ERROR = { code: 'ETIMEDOUT' };
        const HOST_NOT_FOUND_ERROR = { code: 'ENOTFOUND' };
        const HOST_UNREACHABLE_ERROR = { code: 'EHOSTUNREACH' };
        const CONNECTION_REFUSED_ERROR = { code: 'ECONNREFUSED' };

        const errorCases = [
          {
            name: 'on 401',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(401),
            errorClass: StorageAuthenticationError,
            errorMessage: `GET ${POPAPI_HOST}/healthcheck Request failed with status code 401`,
          },
          {
            name: 'in case of network error (REQUEST_TIMEOUT)',
            respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(REQUEST_TIMEOUT_ERROR),
            errorClass: StorageNetworkError,
            errorMessage: `GET ${POPAPI_HOST}/healthcheck ${REQUEST_TIMEOUT_ERROR.code}`,
          },
          {
            name: 'in case of network error (CONNECTION_REFUSED)',
            respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(CONNECTION_REFUSED_ERROR),
            errorClass: StorageNetworkError,
            errorMessage: `GET ${POPAPI_HOST}/healthcheck ${CONNECTION_REFUSED_ERROR.code}`,
          },
          {
            name: 'in case of network error (HOST_NOT_FOUND)',
            respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(HOST_NOT_FOUND_ERROR),
            errorClass: StorageConfigValidationError,
            errorMessage: `GET ${POPAPI_HOST}/healthcheck ${HOST_NOT_FOUND_ERROR.code}`,
          },
          {
            name: 'in case of network error (HOST_UNREACHABLE)',
            respond: (popAPI: nock.Interceptor) => popAPI.replyWithError(HOST_UNREACHABLE_ERROR),
            errorClass: StorageConfigValidationError,
            errorMessage: `GET ${POPAPI_HOST}/healthcheck ${HOST_UNREACHABLE_ERROR.code}`,
          },
        ];

        const unhealthyCases = [
          {
            name: 'on 403',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(403),
          },
          {
            name: 'on 404',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(404),
          },
          {
            name: 'on 500',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(500),
          },
          {
            name: 'on 500 with error data',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(500, { errors: '' }),
          },
          {
            name: 'on 500 with error data',
            respond: (popAPI: nock.Interceptor) => popAPI.reply(500, { errors: [{ message: 'b' }] }),
          },
        ];

        errorCases.forEach((errCase) => {
          it(`should throw ${errCase.errorClass.name} ${errCase.name}`, async () => {
            errCase.respond(nockPopApi(POPAPI_HOST).healthcheck());
            await expect(encStorage.healthcheck(COUNTRY))
              .to.be.rejectedWith(errCase.errorClass, errCase.errorMessage);
          });
        });

        unhealthyCases.forEach((unhealthyCase) => {
          it(`should return false ${unhealthyCase.name}`, async () => {
            unhealthyCase.respond(nockPopApi(POPAPI_HOST).healthcheck());
            const res = await encStorage.healthcheck(COUNTRY);
            expect(res).to.deep.equal({ result: false });
          });
        });
      });
    });
  });
});
