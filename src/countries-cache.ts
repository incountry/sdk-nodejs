import axios from 'axios';
import * as defaultLogger from './logger';

type Country = {
  id: string;
  name: string;
  direct?: boolean;
  region: string;
}

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
    try {
      const response = await axios.get(this.endpoint);
      if (response.data) {
        this.countries = response.data.countries.filter((country: Country) => country.direct);
      } else {
        this.countries = [];
      }
      this.hasFetched = true;
    } catch (exc) {
      this.logger.write('error', exc.message || exc.code, { error: exc, ...loggingMeta });
      throw (exc);
    }
  }
}

export {
  Country,
  CountriesCache,
};
