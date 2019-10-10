const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

const axiosStub = async () => 'hello';

const Storage = proxyquire('../../storage.js', { axios: axiosStub });

describe('Storage', function () {
  
})