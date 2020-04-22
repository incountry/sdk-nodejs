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


function reflect(promiseLike) {
  return promiseLike.then(
    (value) => ({ status: 'fulfilled', value }),
    (error) => ({ status: 'rejected', reason: error }),
  );
}

module.exports = {
  isJSON,
  identity,
  omitNulls,
  reflect,
};
