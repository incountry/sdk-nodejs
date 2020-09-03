/* eslint @typescript-eslint/no-var-requires: "off" */

import axios, { Method } from 'axios';
import get from 'lodash.get';
import { Readable } from 'stream';
import * as t from 'io-ts';
import FormData from 'form-data';
import { Left } from 'fp-ts/lib/Either';
import { StorageServerError } from './errors';
import { Country } from './countries-cache';
import { LogLevel } from './logger';
import { AuthClient } from './auth-client';
import { getErrorMessage, isInvalid, Codec } from './validation/utils';
import { ReadResponseIO, ReadResponse } from './validation/api/read-response';
import { FindResponseIO, FindResponse } from './validation/api/find-response';
import { WriteResponseIO, WriteResponse } from './validation/api/write-response';
import { BatchWriteResponseIO, BatchWriteResponse } from './validation/api/batch-write-response';
import { DeleteResponseIO, DeleteResponse } from './validation/api/delete-response';
import { FindFilter } from './validation/api/find-filter';
import { FindOptions } from './validation/api/find-options';
import { ApiRecordData } from './validation/api/api-record-data';
import { RequestOptions } from './validation/request-options';

const pjson = require('../package.json');

const SDK_VERSION = pjson.version as string;

type BasicRequestOptions<A> = { method: Method; data?: A; path?: string };

type EndpointData = {
  endpoint: string;
  audience: string;
  region: string;
};

type AttachmentData = {
  file: Readable;
  fileName: string;
}

type AttachmentWritableMeta = {
  filename?: string;
  mime_type?: string;
}

const DEFAULT_ENDPOINT_COUNTRY = 'us';
const DEFAULT_ENDPOINT_SUFFIX = '-mt-01.api.incountry.io';
const DEFAULT_HTTP_TIMEOUT = 30 * 1000;

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
    readonly httpTimeout = DEFAULT_HTTP_TIMEOUT,
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

  private async request<A, B>(countryCode: string, path: string, requestOptions: RequestOptions & BasicRequestOptions<A>, codec: Codec<B>, loggingMeta: {}, retry = false): Promise<B> {
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
        timeout: this.httpTimeout,
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

  async read(countryCode: string, recordKey: string, { headers, meta }: RequestOptions = {}): Promise<ReadResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}`,
      { headers, method: 'get' },
      ReadResponseIO,
      { key: recordKey, operation: 'read', ...meta },
      true,
    );
  }

  write(countryCode: string, data: ApiRecordData, { headers, meta }: RequestOptions = {}): Promise<WriteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}`,
      { headers, method: 'post', data },
      WriteResponseIO,
      { key: data.record_key, operation: 'write', ...meta },
      true,
    );
  }

  delete(countryCode: string, recordKey: string, { headers, meta }: RequestOptions = {}): Promise<DeleteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}`,
      { headers, method: 'delete' },
      DeleteResponseIO,
      { key: recordKey, operation: 'delete', ...meta },
      true,
    );
  }

  find(
    countryCode: string,
    data: { filter?: FindFilter; options?: FindOptions },
    { headers, meta }: RequestOptions = {},
  ): Promise<FindResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/find`,
      { headers, method: 'post', data },
      FindResponseIO,
      { operation: 'find', ...meta },
      true,
    );
  }

  batchWrite(
    countryCode: string,
    data: { records: ApiRecordData[] },
    { headers, meta }: RequestOptions = {},
  ): Promise<BatchWriteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/batchWrite`,
      { headers, method: 'post', data },
      BatchWriteResponseIO,
      { operation: 'batchWrite', ...meta },
      true,
    );
  }

  addAttachment(
    countryCode: string,
    recordKey: string,
    attachmentData: AttachmentData,
    { headers, meta }: RequestOptions = {},
  ): Promise<unknown> {
    const data = new FormData();
    data.append('filename', attachmentData.fileName);
    data.append('file', attachmentData.file);

    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments`,
      { headers, method: 'post', data },
      t.unknown,
      { key: recordKey, operation: 'add_attachment', ...meta },
      true,
    );
  }

  upsertAttachment(
    countryCode: string,
    recordKey: string,
    attachmentData: AttachmentData,
    { headers, meta }: RequestOptions = {},
  ): Promise<unknown> {
    const data = new FormData();
    data.append('filename', attachmentData.fileName);
    data.append('file', attachmentData.file);

    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments`,
      { headers, method: 'put', data },
      t.unknown,
      { key: recordKey, operation: 'upsert_attachment', ...meta },
      true,
    );
  }

  deleteAttachment(
    countryCode: string,
    recordKey: string,
    fileId: string,
    { headers, meta }: RequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`,
      { headers, method: 'delete' },
      t.unknown,
      { key: recordKey, operation: 'delete_attachment', ...meta },
      true,
    );
  }

  getAttachmentFile(
    countryCode: string,
    recordKey: string,
    fileId: string,
    { headers, meta }: RequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`,
      { headers, method: 'get' },
      t.unknown,
      { key: recordKey, operation: 'get_attachment_file', ...meta },
      true,
    );
  }

  updateAttachmentMeta(
    countryCode: string,
    recordKey: string,
    fileId: string,
    fileMeta: AttachmentWritableMeta,
    { headers, meta }: RequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`,
      { headers, method: 'patch', data: fileMeta },
      t.unknown,
      { key: recordKey, operation: 'update_attachment_meta', ...meta },
      true,
    );
  }
}

export {
  ApiClient,
  DEFAULT_HTTP_TIMEOUT,
  AttachmentWritableMeta,
};
