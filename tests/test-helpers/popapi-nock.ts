import nock from 'nock';

const getNockedRequestHeaders = (nocked: nock.Scope) => new Promise<Record<string, string>>((resolve) => {
  nocked.on('request', (req) => {
    resolve(req.headers);
  });
});

const getNockedRequestBodyObject = (nocked: nock.Scope) => new Promise((resolve) => {
  nocked.on('request', (_req, _interceptor, reqBody) => {
    const bodyObj = JSON.parse(reqBody);
    resolve(bodyObj);
  });
});

const getNockedRequestBody = (nocked: nock.Scope) => new Promise((resolve) => {
  nocked.on('request', (_req, _interceptor, reqBody) => {
    resolve(reqBody);
  });
});

const nockPopApi = (host: string) => ({
  write: (countryCode: string) => nock(host).post(`/v2/storage/records/${countryCode}`),

  read: (countryCode: string, recordKey: string) => nock(host).get(`/v2/storage/records/${countryCode}/${recordKey}`),

  delete: (countryCode: string, recordKey: string) => nock(host).delete(`/v2/storage/records/${countryCode}/${recordKey}`),

  find: (countryCode: string) => nock(host).post(`/v2/storage/records/${countryCode}/find`),

  batchWrite: (countryCode: string) => nock(host).post(`/v2/storage/records/${countryCode}/batchWrite`),

  addAttachment: (countryCode: string, recordKey: string) => nock(host).post(`/v2/storage/records/${countryCode}/${recordKey}/attachments`),

  upsertAttachment: (countryCode: string, recordKey: string) => nock(host).put(`/v2/storage/records/${countryCode}/${recordKey}/attachments`),

  deleteAttachment: (countryCode: string, recordKey: string, fileId: string) => nock(host).delete(`/v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`),

  getAttachmentMeta: (countryCode: string, recordKey: string, fileId: string) => nock(host).get(`/v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}/meta`),

  updateAttachmentMeta: (countryCode: string, recordKey: string, fileId: string) => nock(host).patch(`/v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}/meta`),

  getAttachmentFile: (countryCode: string, recordKey: string, fileId: string) => nock(host).get(`/v2/storage/records/${countryCode}/${recordKey}/attachments/${fileId}`),
});

export {
  nockPopApi,
  getNockedRequestBodyObject,
  getNockedRequestBody,
  getNockedRequestHeaders,
};
