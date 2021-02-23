import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as _ from 'lodash';
import { Storage, createStorage, KEYS_TO_HASH } from '../../../src/storage';
import { Int } from '../../../src/validation/utils';
import { StorageServerError } from '../../../src/errors';
import {
  LOGGER_STUB,
  POPAPI_HOST,
  defaultGetSecretsCallback,
  EMPTY_API_RECORD,
} from './common';
import { StorageRecordData } from '../../../src/validation/storage-record-data';
import { ApiRecord } from '../../../src/validation/api/api-record';

chai.use(chaiAsPromised);
const { expect } = chai;

const expiresAt = new Date();

const PREPARED_PAYLOAD: Array<{ enc: Partial<ApiRecord>; dec: StorageRecordData }> = [
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      body: '2:IGJNCmV+RXZydaPxDjjhZ80/6aZ2vcEUZ2GuOzKgVSSdM6gYf5RPgFbyLqv+7ihz0CpYFQQWf9xkIyD/u3VYky8dWLq+NXcE2xYL4/U7LqUZmJPQzgcQCABYQ/8vOvUEcrfOAwzGjR6etTp1ki+79JmCEZFSNqcDP1GZXNLFdLoSUp1X2wVlH9ukhJ4jrE0cKDrpJllswRSOz0BhS8PA/73KNKwo718t7fPWpUm7RkyILwYTd/LpPvpXMS6JypEns8fviOpbCLQPpZNBe6zpwbFf3C0qElHlbCyPbDyUiMzVKOwWlYFpozFcRyWegjJ42T8v52+GuRY5',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      version: 0 as Int,
    },
    dec: {
      recordKey: 'InCountryKey',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      profileKey: 'InCountryPK',
      body: '{"data": "InCountryBody"}',
      rangeKey1: 100500 as Int,
    },
  },
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      range_key2: 10050 as Int,
      range_key3: 1005 as Int,
      range_key4: 100 as Int,
      range_key5: 10 as Int,
      range_key6: 1 as Int,
      range_key7: 10 as Int,
      range_key8: 100 as Int,
      range_key9: 1005 as Int,
      range_key10: 10050 as Int,
      service_key1: 'b2d95d1ccfeb1a17c99b74685f7fd4c33647b97cb0559c267a4afcd6f649f3a8',
      service_key2: '9bbc39b2617cbd9fc0290f93c7bbd1772f1a2a45f48ae8dc1a9544d75159c7a2',
      key1: 'daf5914655dc36b7f6f31a97a05205106fdbd725e264235e9e8b31c66489e7ed',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      key4: '08a46eb74e0621208a41cf982b9da83e564a1d448997c5c912477ff79ec4c0e3',
      key5: 'cb86e1358566c9f6c1a52106b32a085b5f02aa8330d3f538ddf55cd599a320f7',
      key6: '5048f7bae5308ca05006ef63025d4243beddbf431f7eff43ac927e471656d1ed',
      key7: 'aa9e0b00099734cafeda1b13393422a381596dc3fd189ee598791fa95f46bce4',
      key8: '54933d4eb2e2d2c1e7ab9344e23a233ee9c537876929d5e265d45ae789b03f6c',
      key9: 'c0e91efa56683cf7f1f0f99b2791e4719e7f70018c6e3938ebaff5735d3c275f',
      key10: '9f54258b7136a70f61891f162243e11930d5cedb3ca89682bab9f28fbedda9b6',
      precommit_body: '2:iqFsqhqby5rX5YAsFnboXoMwSBX7b8JSybs6INJTSMNBSZIulv44hyYw2XlENtOWTCV1Sn1uzM4H4ekTy3vXhTyzbndWBdSWNXcT8mLUDZcByyGJhKunvuvr9B1Bk5GghNzuEvriVsV08LEg',
      body: '2:0Xxd0QYOXstTmrA1Erqm6F/jxt83IHFFHqJPf+QuMpwOObh+OaJ1hCjLLGi2GVnBXENQ5sIt92ayemBXr5JEY2CNUI9lp18gOim+aXveWH1FN8yk5HYqoSyOb5CkJHvp73+AaFmpzTJA3Zxy7z7rfZE2ByCwGtX454iY35jQcUGr1Zpo3m4BX2Y8Rc+RYvAO0J+1y6iDnaNk228d0QwDK4VRISslct+vp7T+O/fnOuyTZzoy/2IoUuvHpkhGsKB2sA+elqCMHz64HGlbGL1OWMmChmQ4R3Ax+/ddzd3xorUQdyz0S1L0YoByE/vCAgGMCkXkQ7kSnqFsRLyJPK4tZWen+G7pt4SdLHoD60vh8QrGtPXVQe4P9HeNCwZXOyhpZbTKvHRXIzsmzGud7Z6rU4DGSBEoeWXcVKIgQ7H0sBCHFZ6ixsw0fb/ciw66HGS/06tyjrWyMsq7HsaOkL01bzaRM9SMeZZskHDGsi4fOvt498SvKF2VT28PMWH8h4Wj24q7o18Ms7NrhnkqDql11FsKLb/O6hcKo5c9GzsSkYN+7KoPwHcj+eWs0Odu4BL2xq7VJiIjCw+25pqlXSpyKV0QTUSXI31VTNoqRRMpBlM06n4SC6SidQfRiiWXqptJEhLA9g==',
      version: 0 as Int,
      is_encrypted: true,
    },
    dec: {
      recordKey: 'InCountryKey',
      body: '{"data": "InCountryBody"}',
      precommitBody: '{"test": "test"}',
      key1: 'InCountryKey1',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      key4: 'InCountryKey4',
      key5: 'InCountryKey5',
      key6: 'InCountryKey6',
      key7: 'InCountryKey7',
      key8: 'InCountryKey8',
      key9: 'InCountryKey9',
      key10: 'InCountryKey10',
      profileKey: 'InCountryPK',
      serviceKey1: 'service1',
      serviceKey2: 'service2',
      rangeKey1: 100500 as Int,
      rangeKey2: 10050 as Int,
      rangeKey3: 1005 as Int,
      rangeKey4: 100 as Int,
      rangeKey5: 10 as Int,
      rangeKey6: 1 as Int,
      rangeKey7: 10 as Int,
      rangeKey8: 100 as Int,
      rangeKey9: 1005 as Int,
      rangeKey10: 10050 as Int,
    },
  },
  // Schema 2.3
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      parent_key: '48734579d0358c2ec2f9dae81cf963f9848d0f3eebe0dd49fa5c5177a76d6e83',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      range_key2: 10050 as Int,
      range_key3: 1005 as Int,
      range_key4: 100 as Int,
      range_key5: 10 as Int,
      range_key6: 1 as Int,
      range_key7: 10 as Int,
      range_key8: 100 as Int,
      range_key9: 1005 as Int,
      range_key10: 10050 as Int,
      service_key1: 'b2d95d1ccfeb1a17c99b74685f7fd4c33647b97cb0559c267a4afcd6f649f3a8',
      service_key2: '9bbc39b2617cbd9fc0290f93c7bbd1772f1a2a45f48ae8dc1a9544d75159c7a2',
      key1: 'daf5914655dc36b7f6f31a97a05205106fdbd725e264235e9e8b31c66489e7ed',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      key4: '08a46eb74e0621208a41cf982b9da83e564a1d448997c5c912477ff79ec4c0e3',
      key5: 'cb86e1358566c9f6c1a52106b32a085b5f02aa8330d3f538ddf55cd599a320f7',
      key6: '5048f7bae5308ca05006ef63025d4243beddbf431f7eff43ac927e471656d1ed',
      key7: 'aa9e0b00099734cafeda1b13393422a381596dc3fd189ee598791fa95f46bce4',
      key8: '54933d4eb2e2d2c1e7ab9344e23a233ee9c537876929d5e265d45ae789b03f6c',
      key9: 'c0e91efa56683cf7f1f0f99b2791e4719e7f70018c6e3938ebaff5735d3c275f',
      key10: '9f54258b7136a70f61891f162243e11930d5cedb3ca89682bab9f28fbedda9b6',
      key11: '7ff26763def85a1a89c0fdb19233e29fb56596678f62f6e41910b169f093ca67',
      key12: '89976091da7295197e2308b75e44bc041dbbf168c24a8e966ad36fb7abfce2d5',
      key13: '0f29faa621589f9697cea59702b2a004e0218f76f31481dec52db49399eda2c7',
      key14: '1ac2ea997a372fbd0e151c4fc7afc8a691357199f084476f5d5be72ab34f95af',
      key15: 'a24189e052ff879096e49b9c49a6ef89fbde0d9a7bedece0888d562ae7e30ba7',
      key16: 'cdf7f7f7e636731cf84d4fced224a7fea12789affc80c3625d34c0b0225a95f1',
      key17: 'e00d696f96834844980da61d99cc2f9e9986a4708e098232f38c3a6882c7a2bd',
      key18: '84d49a44022203031f83598591301bddcb3086c300414cbec552ad22ba01abeb',
      key19: '3eaec397977e9a6edbfb88de2463a05036d279157f15bc6f41dc1d8ea5ef91fb',
      key20: '301597b144c6d48f8a3b20190487647461610e5e438a88fbc9c201c80a3dc039',
      precommit_body: '2:iqFsqhqby5rX5YAsFnboXoMwSBX7b8JSybs6INJTSMNBSZIulv44hyYw2XlENtOWTCV1Sn1uzM4H4ekTy3vXhTyzbndWBdSWNXcT8mLUDZcByyGJhKunvuvr9B1Bk5GghNzuEvriVsV08LEg',
      body: '2:pyZNurXdMOdaQAidLdcVV6sgnS9Ii6G2/4RuajJ61RCZoe3sQFz26NFEnWkzIgYcyCtrZWXLWvYRAFSHMW6Nx/z2+hXMttC9rTrx7J9mm8aOtfvd9w6Ca/T1o1VAmP+4ez42w5/gVPnrzV3LGmjI/5aHcZ2jTkmSEJC6UZAXP+Q+IkA+xZQS/yBF7ptZL8P3PVPH/PYJ7GOpJqJTUhi4NVZ6FOm6ELDMOf5t3113CFtjmiRt5JhdZiApETELe7OpwyuT1VxsoZSCgqJPy8ee/QWyREIF4+en3MKPg5a48jzYFANd4YDjRqiulj2/reFl6tN1lqXujHbkMKjA0aF6uzGFrx06igshtPyhqruA3IWbW2+0g+X7jhcNGYfGIV0BqdvyshH050e9szy8n02qoV6v6N30PvRXFcQDrRy3Vtj0ogYmL0uT8nH843Tt0zX0OyK/oNW9pmlp/990/vDYULhO8iZhm8PqYAeOKP6D1ql9B3syEg7FiCTU4b4FrofJC9cSG/kQ5XgVuLnsYI22BBSkr9mtmG7tFPudtpGEOHP5fUkAFKYw0BCMlERPRIWoSj5YG0KJ0mU+IfavL5KNdlIO5c/H6VM84u3+oVEWYoPjR2vxAuEyT0h61VPwsAnxrQEaMg8SeJijMGVgyuX0eF2xG2n2fh3ohmgDvedtYGutKwhlUnYtkzCgHBFXOTRTUr/+iteFuoRrGJZ/0cfWf915RI1M5v3vCo060MoL7xHXu8eoNMo2GkX5bVUyKioFxgEK5VbMB3ZPEp5/mQb4UPXBysDjEoTJX3EcZyJ9D3OMlsGQ+lDOtuEucy4SVqgA49fXA4ko4HRveerd3TTc09QJ63wXB8Zngass0MnzU40xZ0I+VuaK/5txBPs+zgHZEKGq+W2RGASxJ+IA9roatahtKzcduQ7qvb8UGIb4I9O4DYPQ63zdFGWYSHBVAKICo4+05LkNLNoSumH2NKUptZPShpVJ6BzOoXCF+4S36WM711+0qGhiIO9Ar9C7KgY0',
      version: 0 as Int,
      is_encrypted: true,
    },
    dec: {
      recordKey: 'InCountryKey',
      parentKey: 'InCountryParentKey',
      body: '{"data": "InCountryBody"}',
      precommitBody: '{"test": "test"}',
      key1: 'InCountryKey1',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      key4: 'InCountryKey4',
      key5: 'InCountryKey5',
      key6: 'InCountryKey6',
      key7: 'InCountryKey7',
      key8: 'InCountryKey8',
      key9: 'InCountryKey9',
      key10: 'InCountryKey10',
      key11: 'InCountryKey11',
      key12: 'InCountryKey12',
      key13: 'InCountryKey13',
      key14: 'InCountryKey14',
      key15: 'InCountryKey15',
      key16: 'InCountryKey16',
      key17: 'InCountryKey17',
      key18: 'InCountryKey18',
      key19: 'InCountryKey19',
      key20: 'InCountryKey20',
      profileKey: 'InCountryPK',
      serviceKey1: 'service1',
      serviceKey2: 'service2',
      rangeKey1: 100500 as Int,
      rangeKey2: 10050 as Int,
      rangeKey3: 1005 as Int,
      rangeKey4: 100 as Int,
      rangeKey5: 10 as Int,
      rangeKey6: 1 as Int,
      rangeKey7: 10 as Int,
      rangeKey8: 100 as Int,
      rangeKey9: 1005 as Int,
      rangeKey10: 10050 as Int,
    },
  },
  // Schema 2.4
  {
    enc: {
      record_key: '976143aa1fd12b9ad7449fd9d3a6d25347d71b890b49d4fb5c738e798238865f',
      parent_key: '48734579d0358c2ec2f9dae81cf963f9848d0f3eebe0dd49fa5c5177a76d6e83',
      profile_key: 'f5b5ae4914972ace070fa51b410789324abe063dbe2bb09801410d9ab54bf833',
      range_key1: 100500 as Int,
      range_key2: 10050 as Int,
      range_key3: 1005 as Int,
      range_key4: 100 as Int,
      range_key5: 10 as Int,
      range_key6: 1 as Int,
      range_key7: 10 as Int,
      range_key8: 100 as Int,
      range_key9: 1005 as Int,
      range_key10: 10050 as Int,
      service_key1: 'b2d95d1ccfeb1a17c99b74685f7fd4c33647b97cb0559c267a4afcd6f649f3a8',
      service_key2: '9bbc39b2617cbd9fc0290f93c7bbd1772f1a2a45f48ae8dc1a9544d75159c7a2',
      service_key3: 'b28dbabfcafc244702a4cc5fafc3b0ce6e1ee72dfaf245213295835cd709d24c',
      service_key4: '8733906e7e56077883c9b6c9c1e0835a696468f3946e7ba040e6e05257ad9450',
      service_key5: '83961ca9e493f08319b84693c9328fd2e136c2ae69e2ed44ee6dc8010c0bccc3',
      key1: 'daf5914655dc36b7f6f31a97a05205106fdbd725e264235e9e8b31c66489e7ed',
      key2: 'abcb2ad9e9e0b1787f262b014f517ad1136f868e7a015b1d5aa545b2f575640d',
      key3: '1102ae53e55f0ce1d802cc8bb66397e7ea749fd8d05bd2d4d0f697cedaf138e3',
      key4: '08a46eb74e0621208a41cf982b9da83e564a1d448997c5c912477ff79ec4c0e3',
      key5: 'cb86e1358566c9f6c1a52106b32a085b5f02aa8330d3f538ddf55cd599a320f7',
      key6: '5048f7bae5308ca05006ef63025d4243beddbf431f7eff43ac927e471656d1ed',
      key7: 'aa9e0b00099734cafeda1b13393422a381596dc3fd189ee598791fa95f46bce4',
      key8: '54933d4eb2e2d2c1e7ab9344e23a233ee9c537876929d5e265d45ae789b03f6c',
      key9: 'c0e91efa56683cf7f1f0f99b2791e4719e7f70018c6e3938ebaff5735d3c275f',
      key10: '9f54258b7136a70f61891f162243e11930d5cedb3ca89682bab9f28fbedda9b6',
      key11: '7ff26763def85a1a89c0fdb19233e29fb56596678f62f6e41910b169f093ca67',
      key12: '89976091da7295197e2308b75e44bc041dbbf168c24a8e966ad36fb7abfce2d5',
      key13: '0f29faa621589f9697cea59702b2a004e0218f76f31481dec52db49399eda2c7',
      key14: '1ac2ea997a372fbd0e151c4fc7afc8a691357199f084476f5d5be72ab34f95af',
      key15: 'a24189e052ff879096e49b9c49a6ef89fbde0d9a7bedece0888d562ae7e30ba7',
      key16: 'cdf7f7f7e636731cf84d4fced224a7fea12789affc80c3625d34c0b0225a95f1',
      key17: 'e00d696f96834844980da61d99cc2f9e9986a4708e098232f38c3a6882c7a2bd',
      key18: '84d49a44022203031f83598591301bddcb3086c300414cbec552ad22ba01abeb',
      key19: '3eaec397977e9a6edbfb88de2463a05036d279157f15bc6f41dc1d8ea5ef91fb',
      key20: '301597b144c6d48f8a3b20190487647461610e5e438a88fbc9c201c80a3dc039',
      body: '2:tkBGeJdPByVCl+5ZMGoVdOVDuQEp0Br7w16Mqvgx6Dcv0WBTP1CjqP2cZTZz6Zswc2mRG6oCwRa9ePW3zG+0kxUBtIMt5Djgi7fWLkENdRimx2IiYRXtB7c4oSveQmsRvPEs9BCKpzIp+kZi/XkaStrzLiX8TEGbhmUwiXNVSvtX1Bo4dcQno4n8yjBnfaHQltchsOdiDphIP4fuUMdfa33ZvHeI/FQirwFYlBCev5LZY1FlTdCamy6/AN7M57BwFuf1cl1H14wI1xAEzz8mBSW21IlzBPVUatX7CQMDJvqtPgaXCuSbFBEqun5CiXb+ZmQu2UBqfGChhytt2gtY2mQqW5ZzEjjQNu4mbkcV3twJPFDCJ/ywg6F9btIMmJkMpN7EO7ZkvRiktJilqNWEcokgZyFwTGZSFIGj2fQizbt+Wp05bbUM0OSkkNpyobucU87329lZAsEDov3FwLvcWD+6koHD0jpL6I5iIoCqrkz2vCMM5FXaPpryt1b7+qYjBYSKQZzEASN/iHBZRcs9pLeiI0LnfmAdGPpajTpbRYIVlj2VNAw+/9JSc6E9rif5lHxqqkrw0I3BGul+9qqh1lcrF65akNHw8+6nOtH2UByY3+XfKVAsD5E/QFHTM16agliy+IRtCMQHAbvUxHVUDcyOofKXJL8Elo1VRdcBxvl/4lLuLTkjqGy+b8SKfEhPFHetdUXOP75gsKuU/ZJAlsmPZyO3HMQw59zas2QZp93yk9x7HRQ9We3c+mEdaLgPRPsB75tebJyDY8IYEWUV5gLfnSI2Ha95jmKovHf0z2tVzyxeD7K5ouqxKA35fNrVGoliNcosazhUW3oEOBeVuiXzCLvGhpBb+Z6jEB8V6QkX/O1ihQx8UjKf26tqtqRuD8ofDLa4mXLUNm7TyOlYFl3vEIlSXmqrSreJnb5hQaGRVOBGVUyeyTDBZHt9re4xIxpR76sSQA0VqdOvXJBupYIVS6NRIwKBH5svYi9NweGd+7UfST2r5cXxH3FtU7nZmK+Qd6ckqSlddhW0qBmoeSaQ9cdgcJnruPQGd5wvy774/urFzZJWbCNzLsRnsaWP4ZsmOdzWj3/qFTjBXHqSlgotohYnFR9yeNIVXIIg',
      precommit_body: '2:dmhR5N9V1cmP4ACxlB9xlUPAf1uXIkikW+Tcq87eHPYrOVh7y7bgUDVIRDvIPcfY6/d+ZKpvyHhwDCNSUppQG29OIbXf/Ec8a3cK9Fg4yTvkk8wvSjz3xBFud7UVaRNefefFfLcU6WunjCK/',
      version: 0 as Int,
      is_encrypted: true,
      expires_at: expiresAt,
    },
    dec: {
      recordKey: 'InCountryKey',
      parentKey: 'InCountryParentKey',
      body: '{"data": "InCountryBody"}',
      precommitBody: '{"test": "test"}',
      key1: 'InCountryKey1',
      key2: 'InCountryKey2',
      key3: 'InCountryKey3',
      key4: 'InCountryKey4',
      key5: 'InCountryKey5',
      key6: 'InCountryKey6',
      key7: 'InCountryKey7',
      key8: 'InCountryKey8',
      key9: 'InCountryKey9',
      key10: 'InCountryKey10',
      key11: 'InCountryKey11',
      key12: 'InCountryKey12',
      key13: 'InCountryKey13',
      key14: 'InCountryKey14',
      key15: 'InCountryKey15',
      key16: 'InCountryKey16',
      key17: 'InCountryKey17',
      key18: 'InCountryKey18',
      key19: 'InCountryKey19',
      key20: 'InCountryKey20',
      profileKey: 'InCountryPK',
      serviceKey1: 'service1',
      serviceKey2: 'service2',
      serviceKey3: 'service3',
      serviceKey4: 'service4',
      serviceKey5: 'service5',
      rangeKey1: 100500 as Int,
      rangeKey2: 10050 as Int,
      rangeKey3: 1005 as Int,
      rangeKey4: 100 as Int,
      rangeKey5: 10 as Int,
      rangeKey6: 1 as Int,
      rangeKey7: 10 as Int,
      rangeKey8: 100 as Int,
      rangeKey9: 1005 as Int,
      rangeKey10: 10050 as Int,
      expiresAt,
    },
  },
];

describe('Storage', () => {
  describe('compatibility', async () => {
    let storage: Storage;

    beforeEach(async () => {
      storage = await createStorage({
        apiKey: 'string',
        environmentId: 'InCountry',
        endpoint: POPAPI_HOST,
        encrypt: true,
        normalizeKeys: false,
        getSecrets: defaultGetSecretsCallback,
        logger: LOGGER_STUB(),
      });
    });


    PREPARED_PAYLOAD.forEach(async (data, index) => {
      context(`with prepared payload [${index}]`, () => {
        it('should encrypt and match result', async () => {
          const encrypted = await storage.encryptPayload(data.dec);
          expect(_.omit(encrypted, ['body', 'precommit_body', 'expires_at'])).to.deep.include(_.omit(data.enc, ['body', 'precommit_body', 'expires_at']));
          const { expires_at: originalExpiresAt } = data.enc;
          if (originalExpiresAt) {
            expect(encrypted.expires_at).to.equal(originalExpiresAt.toISOString());
          }
        });

        it('should decrypt and match result', async () => {
          const decrypted = await storage.decryptPayload({ ...EMPTY_API_RECORD, ...data.enc });
          expect(decrypted).to.deep.include(data.dec);
        });
      });

      it('should throw error with wrong body format', async () => {
        const { message: emptyBody } = await storage.crypto.encrypt(JSON.stringify({}));
        const wrongData = { ...EMPTY_API_RECORD, ...data.enc, body: emptyBody };

        await expect(storage.decryptPayload(wrongData)).to.be.rejectedWith(StorageServerError, 'Invalid record body: ');
      });
    });

    context('with different envs', () => {
      it('should encrypt differently', async () => {
        const storage1 = await createStorage({
          apiKey: 'string',
          environmentId: 'env1',
          endpoint: POPAPI_HOST,
          encrypt: true,
          normalizeKeys: false,
          getSecrets: defaultGetSecretsCallback,
          logger: LOGGER_STUB(),
        });

        const storage2 = await createStorage({
          apiKey: 'string',
          environmentId: 'env2',
          endpoint: POPAPI_HOST,
          encrypt: true,
          normalizeKeys: false,
          getSecrets: defaultGetSecretsCallback,
          logger: LOGGER_STUB(),
        });

        const encrypted1 = await storage1.encryptPayload(PREPARED_PAYLOAD[1].dec as StorageRecordData);
        const encrypted2 = await storage2.encryptPayload(PREPARED_PAYLOAD[1].dec as StorageRecordData);

        KEYS_TO_HASH.forEach((key) => {
          if (encrypted1[key] !== undefined && encrypted2[key] !== undefined) {
            expect(encrypted1[key]).to.not.equal(encrypted2[key]);
          }
        });
      });
    });
  });
});
