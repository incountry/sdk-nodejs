const { createStorage, Storage } = require('./storage');
const errors = require('./errors');

module.exports = {
  createStorage,
  Storage,
  ...errors,
};
