const { getFunctionName } = require('io-ts');
const { fold } = require('fp-ts/lib/Either');

function stringify(v) {
  if (typeof v === 'function') {
    return getFunctionName(v);
  }
  return JSON.stringify(v);
}

function last(arr) {
  return arr[arr.length - 1];
}

function getContextPath(context) {
  return context
    .filter((item, index, arr) => (!arr[index - 1] || (arr[index - 1] && arr[index - 1].type._tag !== 'IntersectionType')))
    .map(({ key, type }) => (key || `<${type.name}>`))
    .join('.');
}

function getMessage(e) {
  return e.message !== undefined
    ? e.message
    : `${getContextPath(e.context)} should be ${last(e.context).type.name} but got ${stringify(e.value)} `;
}

function failure(es) {
  return es.map(getMessage);
}

function success() {
  return ['No errors!'];
}

module.exports = {
  report: fold(failure, success),
};
