/* eslint @typescript-eslint/no-var-requires: "off" */

import axios, { Method } from 'axios';
import get from 'lodash.get';
import * as t from 'io-ts';
import { Left } from 'fp-ts/lib/Either';
import { StorageServerError } from './errors';
import { getErrorMessage, isInvalid, Codec } from './validation/utils';
import { RecordResponseIO } from './validation/api-responses/record-response';
import { FindResponseIO } from './validation/api-responses/find-response';
import { WriteResponseIO } from './validation/api-responses/write-response';
import { StorageRecord } from './validation/record';
import { FindFilter } from './validation/find-filter';
import { FindOptions } from './validation/find-options';
import { Country } from './countries-cache';
import { LogLevel } from './logger';
import { AuthClient } from './auth-client';

const pjson = require('../package.json');

const SDK_VERSION = pjson.version as string;

type BasicRequestOptions<A> = { method: Method; data?: A; path?: string; headers?: {} }
type RequestOptions = { headers?: {} };

type FindResponseMeta = {
  total: number;
  count: number;
  limit: number;
  offset: number;
}

type FindResponse = {
  meta: FindResponseMeta;
  data: StorageRecord[];
}

type EndpointData = {
  endpoint: string;
  audience: string;
};

const DEFAULT_POPAPI_HOST = 'https://us.api.incountry.io';

const PoPErrorArray = t.array(t.partial({
  title: t.string,
  source: t.string,
  detail: t.string,
}));

const parsePoPError = (e: Error) => {
  const responseData = get(e, 'response.data', {});
  const requestHeaders = get(e, 'config.headers');
  const responseHeaders = get(e, 'response.headers');
  const code = get(e, 'response.status');
  const errors = get(e, 'response.data.errors', []);
  const errorMessages = PoPErrorArray.is(errors)
    ? errors.map((error) => `${code} ${error.title}: ${error.source} ${error.detail}`)
    : [];
  const errorMessage = errorMessages.length > 0 ? errorMessages.join(';\n') : e.message;
  return {
    errorMessage,
    requestHeaders,
    responseHeaders,
    responseData,
    code,
  };
};

class ApiClient {
  constructor(
    readonly authClient: AuthClient,
    readonly envId: string,
    readonly host: string | undefined,
    readonly loggerFn: (level: LogLevel, message: string, meta?: {}) => void,
    readonly countriesProviderFn: () => Promise<Country[]>,
  ) {
  }

  async headers(tokenAudience: string) {
    const token = await this.authClient.getToken(tokenAudience, this.envId);
    return {
      Authorization: `Bearer ${token}`,
      'x-env-id': this.envId,
      'Content-Type': 'application/json',
      'User-Agent': `SDK-Node.js/${SDK_VERSION}`,
    };
  }

  buildHostName(countryCode: string): string {
    return `https://${countryCode}.api.incountry.io`;
  }

  async getHost(countryCode: string): Promise<string> {
    if (this.host) {
      return this.host;
    }

    const countryRegex = new RegExp(countryCode, 'i');
    let countryHasApi;
    try {
      const countriesList = await this.countriesProviderFn();
      countryHasApi = countriesList.find((country) => countryRegex.test(country.id));
    } catch (err) {
      const popError = parsePoPError(err);
      this.loggerFn('error', popError.errorMessage, err);
      throw new StorageServerError(`Unable to retrieve countries list: ${popError.errorMessage}`, popError.responseData, popError.code);
    }

    return countryHasApi
      ? this.buildHostName(countryCode)
      : DEFAULT_POPAPI_HOST;
  }

  async getEndpoint(countryCode: string, path: string): Promise<EndpointData> {
    const host = await this.getHost(countryCode);
    const countryHost = this.buildHostName(countryCode);
    const audience = host === countryHost ? host : `${host} ${countryHost}`;
    return { endpoint: `${host}/${path}`, audience };
  }

  prepareValidationError(validationFailedResult: Left<t.Errors>): StorageServerError {
    const validationErrorMessage = getErrorMessage(validationFailedResult);
    const error = new StorageServerError(`Response Validation Error: ${validationErrorMessage}`, validationFailedResult);
    this.loggerFn('error', error.message);
    return error;
  }

  private async request<A, B>(countryCode: string, path: string, requestOptions: BasicRequestOptions<A>, codec: Codec<B>, loggingMeta: {} = {}, retry = false): Promise<B> {
    const { endpoint: url, audience } = await this.getEndpoint(countryCode, path);
    const method = requestOptions.method.toUpperCase() as Method;
    const defaultHeaders = await this.headers(audience);
    const headers = {
      ...defaultHeaders,
      ...requestOptions.headers,
    };

    const meta = {
      endpoint: url,
      country: countryCode,
      requestHeaders: headers,
      ...loggingMeta,
    };

    this.loggerFn('info', `Sending ${method} ${url}`, { ...meta, op_result: 'in_progress' });

    let response;
    try {
      response = await axios({
        method,
        url,
        headers,
        data: requestOptions.data,
      });
    } catch (err) {
      if (get(err, 'response.status') === 401 && retry) {
        await this.authClient.getToken(audience, this.envId, true);

        return this.request(countryCode, path, requestOptions, codec, loggingMeta);
      }

      const popError = parsePoPError(err);
      this.loggerFn('error', `Error ${method} ${url} : ${popError.errorMessage}`, {
        ...meta,
        op_result: 'error',
        responseHeaders: popError.responseHeaders,
        message: popError.errorMessage,
      });

      throw new StorageServerError(`${method} ${url} ${popError.errorMessage}`, popError.responseData, popError.code);
    }

    this.loggerFn('info', `Finished ${method} ${url}`, {
      ...meta,
      op_result: 'success',
      responseHeaders: response.config.headers,
    });

    const responseData = codec.decode(response.data);
    if (isInvalid(responseData)) {
      throw this.prepareValidationError(responseData);
    }

    return responseData.right;
  }

  async read(countryCode: string, key: string, requestOptions = {}): Promise<StorageRecord> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${key}`,
      { ...requestOptions, method: 'get' },
      RecordResponseIO,
      { key, operation: 'read' },
      true,
    );
  }

  write(countryCode: string, data: StorageRecord, requestOptions = {}): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}`,
      { ...requestOptions, method: 'post', data },
      WriteResponseIO,
      { key: data.key, operation: 'write' },
      true,
    );
  }

  delete(countryCode: string, key: string, requestOptions = {}): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${key}`,
      { ...requestOptions, method: 'delete' },
      t.unknown,
      { key, operation: 'delete' },
      true,
    );
  }

  find(countryCode: string, data: { filter?: FindFilter; options?: FindOptions }, requestOptions = {}): Promise<FindResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/find`,
      { ...requestOptions, method: 'post', data },
      FindResponseIO,
      { operation: 'find' },
      true,
    );
  }

  batchWrite(countryCode: string, data: { records: StorageRecord[] }, requestOptions = {}): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/batchWrite`,
      { ...requestOptions, method: 'post', data },
      WriteResponseIO,
      { operation: 'batchWrite' },
      true,
    );
  }
}

export {
  RequestOptions,
  FindResponseMeta,
  FindResponse,
  ApiClient,
  DEFAULT_POPAPI_HOST,
};
