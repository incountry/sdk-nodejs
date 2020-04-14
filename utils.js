function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

const identity = (a) => a;

module.exports = {
  isJSON,
  identity,
};
