import axios from 'axios';
import * as defaultLogger from './logger';

type Country = {
  id: string;
  name: string;
  direct?: boolean;
}

const COUNTRIES_CACHE_TIMEOUT = 60 * 1000;
const PORTAL_HOST = 'portal-backend.incountry.com';

class CountriesCache {
  url: string;
  expiresOn: number;
  logger: defaultLogger.Logger;
  countries: Array<Country> = [];
  hasFetched = false;

  constructor(
    host: string = PORTAL_HOST,
    readonly timeout: number = COUNTRIES_CACHE_TIMEOUT,
    expiresOn?: number,
    logger?: defaultLogger.Logger,
  ) {
    this.url = `https://${host}/countries`;
    this.expiresOn = typeof expiresOn === 'number' ? expiresOn : Date.now() + this.timeout;
    this.logger = logger !== undefined ? logger : defaultLogger.withBaseLogLevel('error');
  }

  async getCountries(timeStamp?: number): Promise<Array<Country>> {
    const now = typeof timeStamp === 'number' ? timeStamp : Date.now();
    if (!this.hasFetched || now >= this.expiresOn) {
      await this.updateCountries();
      this.expiresOn = now + this.timeout;
    }

    return this.countries;
  }

  private async updateCountries(): Promise<void> {
    try {
      const response = await axios.get(this.url);
      if (response.data) {
        this.countries = response.data.countries.filter((country: Country) => country.direct);
      } else {
        this.countries = [];
      }
      this.hasFetched = true;
    } catch (exc) {
      this.logger.write('error', exc.message || exc.code, exc);
      throw (exc);
    }
  }
}

export {
  Country,
  CountriesCache,
};
