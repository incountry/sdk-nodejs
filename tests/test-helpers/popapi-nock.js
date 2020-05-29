const nock = require('nock');

const popAPIEndpoints = {
  write: {
    verb: 'post',
    path: (country) => `/v2/storage/records/${country}`,
  },
  read: {
    verb: 'get',
    path: (country, key) => `/v2/storage/records/${country}/${key}`,
  },
  delete: {
    verb: 'delete',
    path: (country, key) => `/v2/storage/records/${country}/${key}`,
  },
  find: {
    verb: 'post',
    path: (country) => `/v2/storage/records/${country}/find`,
  },
  batchWrite: {
    verb: 'post',
    path: (country) => `/v2/storage/records/${country}/batchWrite`,
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
