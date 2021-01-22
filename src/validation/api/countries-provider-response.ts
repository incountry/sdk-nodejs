import * as t from 'io-ts';

const CountryDescriptionIO = t.type({
  id: t.string,
  direct: t.union([t.null, t.boolean]),
});

type Country = {
  id: string;
  name: string;
  direct?: boolean;
  region: string;
}

const CountriesProviderResponseIO = t.type({
  countries: t.array(CountryDescriptionIO),
}, 'CountriesProviderResponseIO');

type CountriesProviderResponse = {
  countries: Country[];
};

export {
  CountriesProviderResponseIO,
  CountriesProviderResponse,
  Country,
};
