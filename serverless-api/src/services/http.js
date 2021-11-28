const fetch = require('node-fetch');
const log = require('./log');

function getResponseBody(res) {
  const contentType = res.headers.get('content-type');

  return contentType?.includes('json') ? res.json() : res.text();
}

function handleResponse(method, url, body = {}) {
  return async function (res) {
    if (res.status !== 200) {
      const response = await getResponseBody(res);

      const errorMsg = [
        `Unexpected HTTP status: ${res.status}`,
        `Request: ${method} ${url} ${body}`,
        `Response: ${JSON.stringify(response, null, 2)}`
      ].join('\n');

      log.error(errorMsg);

      throw new Error(errorMsg);
    }

    return res;
  };
}

function createMethod(method) {
  return function (url, options) {
    return fetch(url, { method, ...options }).then(
      handleResponse(method, url, options?.body)
    );
  };
}

module.exports = {
  get: createMethod('GET'),
  put: createMethod('PUT')
};
