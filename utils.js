function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

const identity = (a) => a;

const omitNulls = (r) => Object.keys(r)
  .filter((k) => r[k] != null)
  .reduce((acc, k) => Object.assign(acc, { [k]: r[k] }), {});

module.exports = {
  isJSON,
  identity,
  omitNulls,
};
