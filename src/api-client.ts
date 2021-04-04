/* eslint @typescript-eslint/no-var-requires: "off" */

import axios, { Method, ResponseType } from 'axios';
import get from 'lodash.get';
import { Readable } from 'stream';
import * as t from 'io-ts';
import FormData from 'form-data';
import { Left } from 'fp-ts/lib/Either';
import {
  StorageError,
  StorageAuthenticationError,
  StorageConfigValidationError,
  StorageServerError,
  InputValidationError,
} from './errors';
import { Country } from './countries-cache';
import { LogLevel } from './logger';
import { AuthClient } from './auth-client';
import {
  isInvalid,
  Codec,
  ReadableIO,
  toStorageServerError,
  toStorageServerValidationError,
} from './validation/utils';
import { ReadResponseIO, ReadResponse } from './validation/api/read-response';
import { FindResponseIO, FindResponse } from './validation/api/find-response';
import { WriteResponseIO, WriteResponse } from './validation/api/write-response';
import { BatchWriteResponseIO, BatchWriteResponse } from './validation/api/batch-write-response';
import { DeleteResponseIO, DeleteResponse } from './validation/api/delete-response';
import { AddAttachmentResponseIO, AddAttachmentResponse } from './validation/api/add-attachment-response';
import { UpsertAttachmentResponse, UpsertAttachmentResponseIO } from './validation/api/upsert-attachment-response';
import { ApiFindOptions } from './validation/api/api-find-options';
import { ApiRecordData } from './validation/api/api-record-data';
import { RequestOptions } from './validation/user-input/request-options';
import { AttachmentWritableMeta } from './validation/user-input/attachment-writable-meta';
import { UpdateAttachmentMetaResponse, UpdateAttachmentMetaResponseIO } from './validation/api/update-attachment-meta-response';
import { GetAttachmentMetaResponse, GetAttachmentMetaResponseIO } from './validation/api/get-attachment-meta-response';
import { getFileNameFromHeaders } from './utils';
import { AttachmentData } from './validation/user-input/attachment-data';
import { ApiFindFilter } from './validation/api/api-find-filter';

const pjson = require('../package.json');

const SDK_VERSION = pjson.version as string;

const DEFAULT_FILE_NAME = 'file';

type BasicRequestOptions<A> = { method: Method; data?: A; path?: string; responseType?: ResponseType };

type EndpointData = {
  endpoint: string;
  audience: string;
  region: string;
};

type GetAttachmentFileResponse = {
  file: Readable;
  fileName: string;
};

type DetailedErrorDescription = {
  errorMessage: string;
  requestHeaders?: unknown;
  responseHeaders?: unknown;
  responseData?: unknown;
  code?: string | number;
};

const DEFAULT_ENDPOINT_COUNTRY = 'us';
const DEFAULT_ENDPOINT_SUFFIX = '-mt-01.api.incountry.io';
const DEFAULT_HTTP_TIMEOUT = 30 * 1000;
const DEFAULT_HTTP_MAX_BODY_LENGTH = 100 * 1024 * 1024; // 100 Mb

const ATTACHMENT_TOO_LARGE_ERROR_MESSAGE = `Attachment is too large. Max allowed attachment size is ${DEFAULT_HTTP_MAX_BODY_LENGTH} bytes`;

const PoPErrorArray = t.array(t.partial({
  title: t.string,
  source: t.string,
  detail: t.string,
}));

const parsePoPError = (e: Error): DetailedErrorDescription => {
  const responseData = get(e, 'response.data', {});
  const requestHeaders = get(e, 'config.headers');
  const responseHeaders = get(e, 'response.headers');
  const code = get(e, 'response.status') || get(e, 'code');
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

const getError = (e: DetailedErrorDescription, prefix: string) => {
  if (e.code && e.code.toString().length) {
    const strCode = e.code.toString();
    if (strCode.match('EHOSTUNREACH') || strCode.match('ENOTFOUND')) {
      return new StorageConfigValidationError(`${prefix} ${e.errorMessage || e.code}`, e);
    }

    if (e.code === 401) {
      return new StorageAuthenticationError(`${prefix} ${e.errorMessage || e.code}`, e);
    }
  }

  return toStorageServerError(`${prefix} `)(e);
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
    readonly httpMaxBodyLength = DEFAULT_HTTP_MAX_BODY_LENGTH,
  ) {
  }

  async headers(tokenAudience: string, region: string): Promise<Record<string, string>> {
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
      this.loggerFn('error', err.message, { error: err, ...loggingMeta });
      if (err instanceof StorageError) {
        throw err;
      }
      throw toStorageServerError('Unable to retrieve countries list: ')(err);
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
    const error = toStorageServerValidationError('Response Validation Error: ')(validationFailedResult);
    this.loggerFn('error', error.message, loggingMeta);
    return error;
  }

  private async request<A, B>(countryCode: string, path: string, requestOptions: RequestOptions & BasicRequestOptions<A>, codec: Codec<B>, loggingMeta: {}, retry = false): Promise<{ data: B; headers: Record<string, string> }> {
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
        maxBodyLength: this.httpMaxBodyLength,
        responseType: requestOptions.responseType,
      });
    } catch (err) {
      if (get(err, 'code') === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED') {
        throw new InputValidationError(ATTACHMENT_TOO_LARGE_ERROR_MESSAGE);
      }

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

      throw getError(popError, `${method} ${url}`);
    }

    this.loggerFn('info', `Finished ${method} ${url}`, {
      ...meta,
      op_result: 'success',
      responseHeaders: response.headers,
    });

    const responseData = codec.decode(response.data);
    if (isInvalid(responseData)) {
      throw this.prepareValidationError(responseData, loggingMeta);
    }
    return { data: responseData.right, headers: response.headers };
  }

  async read(countryCode: string, recordKey: string, { headers, meta }: RequestOptions = {}): Promise<ReadResponse> {
    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}`,
      { headers, method: 'get' },
      ReadResponseIO,
      { key: recordKey, operation: 'read', ...meta },
      true,
    );

    return responseData;
  }

  async write(countryCode: string, data: ApiRecordData, { headers, meta }: RequestOptions = {}): Promise<WriteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}`,
      { headers, method: 'post', data },
      WriteResponseIO,
      { key: data.record_key, operation: 'write', ...meta },
      true,
    );
  }

  async delete(countryCode: string, recordKey: string, { headers, meta }: RequestOptions = {}): Promise<DeleteResponse> {
    return this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}`,
      { headers, method: 'delete' },
      DeleteResponseIO,
      { key: recordKey, operation: 'delete', ...meta },
      true,
    );
  }

  async find(
    countryCode: string,
    data: { filter?: ApiFindFilter; options?: ApiFindOptions },
    { headers, meta }: RequestOptions = {},
  ): Promise<FindResponse> {
    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/find`,
      { headers, method: 'post', data },
      FindResponseIO,
      { operation: 'find', ...meta },
      true,
    );
    return responseData;
  }

  async batchWrite(
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

  async addAttachment(
    countryCode: string,
    recordKey: string,
    { file, fileName, mimeType }: AttachmentData,
    { headers, meta }: RequestOptions = {},
  ): Promise<AddAttachmentResponse> {
    const data = new FormData();
    data.append('file', file, {
      filename: typeof fileName === 'string' ? fileName : DEFAULT_FILE_NAME,
      contentType: mimeType,
    });

    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments`,
      { headers: { ...headers, ...data.getHeaders() }, method: 'post', data },
      AddAttachmentResponseIO,
      { key: recordKey, operation: 'add_attachment', ...meta },
      true,
    );

    return responseData;
  }

  async upsertAttachment(
    countryCode: string,
    recordKey: string,
    attachmentData: AttachmentData,
    { headers, meta }: RequestOptions = {},
  ): Promise<UpsertAttachmentResponse> {
    const data = new FormData();
    data.append('file', attachmentData.file, {
      filename: attachmentData.fileName,
      contentType: attachmentData.mimeType,
    });

    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments`,
      { headers: { ...headers, ...data.getHeaders() }, method: 'put', data },
      UpsertAttachmentResponseIO,
      { key: recordKey, operation: 'upsert_attachment', ...meta },
      true,
    );

    return responseData;
  }

  async deleteAttachment(
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

  async getAttachmentFile(
    countryCode: string,
    recordKey: string,
    fileId: string,
    { headers, meta }: RequestOptions = {},
  ): Promise<GetAttachmentFileResponse> {
    const { data: file, headers: responseHeaders } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`,
      { headers, method: 'get', responseType: 'stream' },
      ReadableIO,
      { key: recordKey, operation: 'get_attachment_file', ...meta },
      true,
    );

    return {
      file,
      fileName: getFileNameFromHeaders(responseHeaders) || DEFAULT_FILE_NAME,
    };
  }

  async updateAttachmentMeta(
    countryCode: string,
    recordKey: string,
    fileId: string,
    { fileName, mimeType }: AttachmentWritableMeta,
    { headers, meta }: RequestOptions = {},
  ): Promise<UpdateAttachmentMetaResponse> {
    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}/meta`,
      { headers, method: 'patch', data: { filename: fileName, mime_type: mimeType } },
      UpdateAttachmentMetaResponseIO,
      { key: recordKey, operation: 'update_attachment_meta', ...meta },
      true,
    );

    return responseData;
  }

  async getAttachmentMeta(
    countryCode: string,
    recordKey: string,
    fileId: string,
    { headers, meta }: RequestOptions = {},
  ): Promise<GetAttachmentMetaResponse> {
    const { data: responseData } = await this.request(
      countryCode,
      `v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}/meta`,
      { headers, method: 'get' },
      GetAttachmentMetaResponseIO,
      { key: recordKey, operation: 'get_attachment_meta', ...meta },
      true,
    );

    return responseData;
  }
}

export {
  ApiClient,
  ATTACHMENT_TOO_LARGE_ERROR_MESSAGE,
  DEFAULT_HTTP_MAX_BODY_LENGTH,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_FILE_NAME,
  GetAttachmentFileResponse,
};
