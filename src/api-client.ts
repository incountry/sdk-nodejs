/* eslint @typescript-eslint/no-var-requires: "off" */

import axios, { Method } from 'axios';
import get from 'lodash.get';

import * as t from 'io-ts';
import { Left } from 'fp-ts/lib/Either';
import { StorageServerError } from './errors';
import { getErrorMessage, isInvalid, Codec } from './validation/utils';
import { RecordResponseIO, RecordResponse } from './validation/api-responses/record-response';
import { FindResponseIO, FindResponse } from './validation/api-responses/find-response';
import { WriteResponseIO, WriteResponse } from './validation/api-responses/write-response';
import { BatchWriteResponseIO, BatchWriteResponse } from './validation/api-responses/batch-write-response';
import { FindFilter } from './validation/find-filter';
import { FindOptions } from './validation/find-options';
import { Country } from './countries-cache';
import { LogLevel } from './logger';
import { AuthClient } from './auth-client';
import { DeleteResponseIO, DeleteResponse } from './validation/api-responses/delete-response';
import { ApiRecord } from './validation/api-responses/api-record';


const pjson = require('../package.json');

const SDK_VERSION = pjson.version as string;

type BasicRequestOptions<A> = { method: Method; data?: A; path?: string; headers?: {} }
type RequestOptions = { headers?: {} };

type RecordData = { key: string } & Partial<Omit<ApiRecord, 'key' | 'version'>>

type EndpointData = {
  endpoint: string;
  audience: string;
  region: string;
};

const DEFAULT_ENDPOINT_COUNTRY = 'us';
const DEFAULT_ENDPOINT_SUFFIX = '-mt-01.api.incountry.io';

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
    readonly countriesProviderFn: (loggingMeta: {}) => Promise<Country[]>,
    readonly endpointMask?: string,
  ) {
  }

  async headers(tokenAudience: string, region: string) {
    const token = await this.authClient.getToken(tokenAudience, this.envId, region);
    return {
      Authorization: `Bearer ${token}`,
      'x-env-id': this.envId,
      'Content-Type': 'application/json',
      'User-Agent': `SDK-Node.js/${SDK_VERSION}`,
    };
  }

  buildHostName(countryCode: string): string {
    const suffix = this.endpointMask || DEFAULT_ENDPOINT_SUFFIX;
    return `https://${countryCode}${suffix}`;
  }

  async findMidPOPCountry(countryCode: string, loggingMeta: {}): Promise<Country | undefined> {
    const countryRegex = new RegExp(countryCode, 'i');
    let midpop;
    try {
      const countriesList = await this.countriesProviderFn(loggingMeta);
      midpop = countriesList.find((country) => countryRegex.test(country.id));
    } catch (err) {
      const popError = parsePoPError(err);
      this.loggerFn('error', popError.errorMessage, { error: err, ...loggingMeta });
      throw new StorageServerError(`Unable to retrieve countries list: ${popError.errorMessage}`, popError.responseData, popError.code);
    }

    return midpop;
  }

  async getEndpoint(countryCode: string, path: string, loggingMeta: {}): Promise<EndpointData> {
    let host;
    let audience;
    let region = 'EMEA';
    const countryHost = this.buildHostName(countryCode);
    if (this.host) {
      host = this.host;
      audience = host;
      if (this.endpointMask && countryHost !== host) {
        audience = `${host} ${countryHost}`;
      }
    } else {
      const midpop = await this.findMidPOPCountry(countryCode, loggingMeta);
      if (midpop) {
        host = countryHost;
        audience = host;
        region = midpop.region;
      } else {
        host = this.buildHostName(DEFAULT_ENDPOINT_COUNTRY);
        audience = `${host} ${countryHost}`;
      }
    }

    return { endpoint: `${host}/${path}`, audience, region };
  }

  prepareValidationError(validationFailedResult: Left<t.Errors>, loggingMeta: {}): StorageServerError {
    const validationErrorMessage = getErrorMessage(validationFailedResult);
    const error = new StorageServerError(`Response Validation Error: ${validationErrorMessage}`, validationFailedResult);
    this.loggerFn('error', error.message, loggingMeta);
    return error;
  }

  private async request<A, B>(countryCode: string, path: string, requestOptions: BasicRequestOptions<A>, codec: Codec<B>, loggingMeta: {}, retry = false): Promise<B> {
    const { endpoint: url, audience, region } = await this.getEndpoint(countryCode, path, loggingMeta);
    const method = requestOptions.method.toUpperCase() as Method;
    const defaultHeaders = await this.headers(audience, region);
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
        await this.authClient.getToken(audience, this.envId, region, true);

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
      throw this.prepareValidationError(responseData, loggingMeta);
    }

    return responseData.right;
  }

  async read(countryCode: string, key: string, requestOptions = {}, callLoggingMeta?: any): Promise<RecordResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${key}`,
      { ...requestOptions, method: 'get' },
      RecordResponseIO,
      { key, operation: 'read', callLoggingMeta },
      true,
    );
  }

  write(countryCode: string, data: RecordData, requestOptions = {}, callLoggingMeta?: any): Promise<WriteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}`,
      { ...requestOptions, method: 'post', data },
      WriteResponseIO,
      { key: data.key, operation: 'write', callLoggingMeta },
      true,
    );
  }

  delete(countryCode: string, key: string, requestOptions = {}, callLoggingMeta?: any): Promise<DeleteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${key}`,
      { ...requestOptions, method: 'delete' },
      DeleteResponseIO,
      { key, operation: 'delete', callLoggingMeta },
      true,
    );
  }

  find(countryCode: string, data: { filter?: FindFilter; options?: FindOptions }, requestOptions = {}, callLoggingMeta?: any): Promise<FindResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/find`,
      { ...requestOptions, method: 'post', data },
      FindResponseIO,
      { operation: 'find', callLoggingMeta },
      true,
    );
  }

  batchWrite(countryCode: string, data: { records: RecordData[] }, requestOptions = {}, callLoggingMeta?: any): Promise<BatchWriteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/batchWrite`,
      { ...requestOptions, method: 'post', data },
      BatchWriteResponseIO,
      { operation: 'batchWrite', callLoggingMeta },
      true,
    );
  }
}

export {
  RecordData,
  RequestOptions,
  ApiClient,
};
