const createStorage = require('./storage');
const errors = require('./errors');

module.exports = {
  createStorage,
  ...errors,
};
