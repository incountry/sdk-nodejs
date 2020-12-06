import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as _ from 'lodash';
import { Storage, createStorage, KEYS_TO_HASH } from '../../../src/storage';
import { Int } from '../../../src/validation/utils';
import {
  LOGGER_STUB,
  POPAPI_HOST,
  defaultGetSecretsCallback,
  EMPTY_API_RECORD,
} from './common';
import { StorageRecordData } from '../../../src/validation/storage-record-data';

chai.use(chaiAsPromised);
const { expect } = chai;

const PREPARED_PAYLOAD = [
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
          expect(_.omit(encrypted, ['body', 'precommit_body'])).to.deep.include(_.omit(data.enc, ['body', 'precommit_body']));
        });

        it('should decrypt and match result', async () => {
          const decrypted = await storage.decryptPayload({ ...EMPTY_API_RECORD, ...data.enc });
          expect(decrypted).to.deep.include(data.dec);
        });
      });

      it('should throw error with wrong body format', async () => {
        const { message: emptyBody } = await storage.crypto.encrypt(JSON.stringify({}));
        const wrongData = { ...EMPTY_API_RECORD, ...data.enc, body: emptyBody };

        await expect(storage.decryptPayload(wrongData)).to.be.rejectedWith('Invalid record body');
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
