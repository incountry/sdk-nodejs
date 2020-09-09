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
  write: (country: string) => nock(host).post(`/v2/storage/records/${country}`),

  read: (country: string, key: string) => nock(host).get(`/v2/storage/records/${country}/${key}`),

  delete: (country: string, key: string) => nock(host).delete(`/v2/storage/records/${country}/${key}`),

  find: (country: string) => nock(host).post(`/v2/storage/records/${country}/find`),

  batchWrite: (country: string) => nock(host).post(`/v2/storage/records/${country}/batchWrite`),

  addAttachment: (country: string, key: string) => nock(host).post(`/v2/storage/records/${country}/${key}/attachments`),

  upsertAttachment: (country: string, key: string) => nock(host).put(`/v2/storage/records/${country}/${key}/attachments`),

  deleteAttachment: (country: string, key: string, file: string) => nock(host).delete(`/v2/storage/records/${country}/${key}/attachments/${file}`),

  updateAttachmentMeta: (country: string, key: string, file: string) => nock(host).patch(`/v2/storage/records/${country}/${key}/attachments/${file}`),

  getAttachmentFile: (country: string, key: string, file: string) => nock(host).get(`/v2/storage/records/${country}/${key}/attachments/${file}`),
});

export {
  nockPopApi,
  getNockedRequestBodyObject,
  getNockedRequestBody,
  getNockedRequestHeaders,
};
