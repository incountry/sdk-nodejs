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

function formatProps(props) {
  const formattedProps = Object.keys(props)
    .map((k) => `${k}: ${props[k].name}`)
    .join(', ');
  return `{ ${formattedProps} }`;
}

function formatType(type) {
  return type.props ? formatProps(type.props) : type.name;
}

function isUnionType(type) { return type._tag === 'UnionType'; }
function isIntersectionType(type) { return type._tag === 'IntersectionType'; }

function getMessage(e) {
  const filtered = e.context
    .filter((item, index, arr) => {
      const prevItem = arr[index - 1];
      if (!prevItem) {
        return true;
      }
      if (item.actual === prevItem.actual) {
        return false;
      }

      if (isIntersectionType(prevItem.type) || isUnionType(prevItem.type)) {
        return false;
      }

      return true;
    });

  return e.message !== undefined
    ? e.message
    : `${formatContextPath(filtered)} should be ${formatType(last(filtered).type)} but got ${stringify(e.value)}`;
}

function failure(errors) {
  return getMessage(last(errors));
}

function success() {
  return 'No errors!';
}

module.exports = {
  report: fold(failure, success),
};
