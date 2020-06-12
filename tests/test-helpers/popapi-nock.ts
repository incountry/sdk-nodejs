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

type PopAPIAction = keyof typeof popAPIEndpoints;
const nockEndpoint = (host: string, action: PopAPIAction, country?: string, key?: string) => {
  const endpoint = popAPIEndpoints[action];

  return nock(host)[endpoint.verb](endpoint.path(country, key));
};

export {
  nockEndpoint,
  popAPIEndpoints,
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
};
