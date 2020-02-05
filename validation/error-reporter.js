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

function formatContextPath(context) {
  return context
    .map(({ key, type }) => (key || `<${type.name}>`))
    .join('.');
}

function isUnionType(type) { return type._tag === 'UnionType'; }
function isIntersectionType(type) { return type._tag === 'IntersectionType'; }

function getMessage(e) {
  const filtered = e.context
    .filter((item, index, arr) => {
      const prevItem = arr[index - 1];
      return prevItem === undefined || (!isIntersectionType(prevItem.type) && !isUnionType(prevItem.type));
    });

  return e.message !== undefined
    ? e.message
    : `${formatContextPath(filtered)} should be ${last(filtered).type.name} but got ${stringify(e.value)}`;
}

function failure(errors) {
  return last(errors.map(getMessage));
}

function success() {
  return 'No errors!';
}

module.exports = {
  report: fold(failure, success),
};
