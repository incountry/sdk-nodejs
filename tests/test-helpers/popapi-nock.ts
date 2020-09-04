import nock from 'nock';

type Method = 'get' | 'post' | 'delete';
const popAPIEndpoints = {
  write: {
    verb: 'post' as Method,
    path: (country?: string) => `/v2/storage/records/${country}`,
  },
  read: {
    verb: 'get' as Method,
    path: (country?: string, key?: string) => `/v2/storage/records/${country}/${key}`,
  },
  delete: {
    verb: 'delete' as Method,
    path: (country?: string, key?: string) => `/v2/storage/records/${country}/${key}`,
  },
  find: {
    verb: 'post' as Method,
    path: (country?: string) => `/v2/storage/records/${country}/find`,
  },
  batchWrite: {
    verb: 'post' as Method,
    path: (country?: string) => `/v2/storage/records/${country}/batchWrite`,
  },
  addAttachment: {
    verb: 'post' as Method,
    path: (country?: string, key?: string) => `/v2/storage/records/${country}/${key}/attachments`,
  },
  upsertAttachment: {
    verb: 'put' as Method,
    path: (country?: string, key?: string) => `/v2/storage/records/${country}/${key}/attachments`,
  },
  deleteAttachment: {
    verb: 'delete' as Method,
    path: (country?: string, key?: string, file?: string) => `/v2/storage/records/${country}/${key}/attachments/${file}`,
  },
  updateAttachmentMeta: {
    verb: 'patch' as Method,
    path: (country?: string, key?: string, file?: string) => `/v2/storage/records/${country}/${key}/attachments/${file}`,
  },
  getAttachmentFile: {
    verb: 'get' as Method,
    path: (country?: string, key?: string, file?: string) => `/v2/storage/records/${country}/${key}/attachments/${file}`,
  },
};

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

type PopAPIAction = keyof typeof popAPIEndpoints;
const nockEndpoint = (host: string, action: PopAPIAction, country?: string, key?: string, file?: string) => {
  const endpoint = popAPIEndpoints[action];

  return nock(host)[endpoint.verb](endpoint.path(country, key, file));
};

export {
  nockEndpoint,
  popAPIEndpoints,
  getNockedRequestBodyObject,
  getNockedRequestBody,
  getNockedRequestHeaders,
};
