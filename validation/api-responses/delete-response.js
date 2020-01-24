const t = require('io-ts');
const { validateWithIO } = require('../utils');

const DeleteResponseIO = t.type({
  success: t.boolean,
});

const validateDeleteResponse = (responseData) => validateWithIO(responseData, DeleteResponseIO);

module.exports = {
  DeleteResponseIO,
  validateDeleteResponse,
};
