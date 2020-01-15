const nock = require('nock');

const popAPIEndpoints = {
  write: {
    verb: 'post',
    path: (key) => `/v2/storage/records/${key}`,
  },
  read: {
    verb: 'get',
    path: (key, country) => `/v2/storage/records/${key}/${country}`,
  },
  delete: {
    verb: 'delete',
    path: (key, country) => `/v2/storage/records/${key}/${country}`,
  },
  find: {
    verb: 'post',
    path: (key) => `/v2/storage/records/${key}/find`,
  },
  batchWrite: {
    verb: 'post',
    path: (key) => `/v2/storage/records/${key}/batchWrite`,
  },
};

const getNockedRequestHeaders = (nocked) => new Promise((resolve) => {
  nocked.on('request', (req) => {
    resolve(req.headers);
  });
});

const getNockedRequestBodyObject = (nocked) => new Promise((resolve) => {
  nocked.on('request', (req, interceptor, reqBody) => {
    const bodyObj = JSON.parse(reqBody);
    resolve(bodyObj);
  });
});

const nockEndpoint = (host, method, country = undefined, key = undefined) => {
  const endpoint = popAPIEndpoints[method];

  return nock(host)[endpoint.verb](endpoint.path(country, key));
};

module.exports = {
  nockEndpoint,
  popAPIEndpoints,
  getNockedRequestBodyObject,
  getNockedRequestHeaders,
};
