import axios from 'axios';
import * as defaultLogger from './logger';
import { CountriesProviderResponseIO, Country } from './validation/api/countries-provider-response';
import { isInvalid, toStorageServerError, toStorageServerValidationError } from './validation/utils';

const COUNTRIES_CACHE_TIMEOUT = 60 * 1000;
const DEFAULT_COUNTRIES_ENDPOINT = 'https://portal-backend.incountry.com/countries';

class CountriesCache {
  expiresOn: number;
  logger: defaultLogger.Logger;
  countries: Array<Country> = [];
  hasFetched = false;

  constructor(
    readonly endpoint: string = DEFAULT_COUNTRIES_ENDPOINT,
    readonly timeout: number = COUNTRIES_CACHE_TIMEOUT,
    expiresOn?: number,
    logger?: defaultLogger.Logger,
  ) {
    this.expiresOn = typeof expiresOn === 'number' ? expiresOn : Date.now() + this.timeout;
    this.logger = logger !== undefined ? logger : defaultLogger.withBaseLogLevel('error');
  }

  async getCountries(timeStamp?: number, loggingMeta?: {}): Promise<Array<Country>> {
    const now = typeof timeStamp === 'number' ? timeStamp : Date.now();
    if (!this.hasFetched || now >= this.expiresOn) {
      await this.updateCountries(loggingMeta);
      this.expiresOn = now + this.timeout;
    }

    return this.countries;
  }

  private async updateCountries(loggingMeta?: {}): Promise<void> {
    let response;
    try {
      response = await axios.get(this.endpoint);
    } catch (e) {
      this.logger.write('error', e.message || e.code, { error: e, ...loggingMeta });
      throw toStorageServerError('Countries provider error: ')(e);
    }

    if (response.data) {
      const countriesData = CountriesProviderResponseIO.decode(response.data);
      if (isInvalid(countriesData)) {
        throw toStorageServerValidationError('Countries provider response validation error: ')(countriesData);
      }
      this.countries = response.data.countries.filter((country: Country) => country.direct);
    } else {
      this.countries = [];
    }
    this.hasFetched = true;
  }
}

export {
  Country,
  CountriesCache,
};
