const nock = require('nock');

const popAPIEndpoints = {
  write: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}`,
  },
  read: {
    verb: 'get',
    path: (...args) => `/v2/storage/records/${args[0]}/${args[1]}`,
  },
  delete: {
    verb: 'delete',
    path: (...args) => `/v2/storage/records/${args[0]}/${args[1]}`,
  },
  find: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}/find`,
  },
  batchWrite: {
    verb: 'post',
    path: (...args) => `/v2/storage/records/${args[0]}/batchWrite`,
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
