const t = require('io-ts');

/**
 * @typedef {string | Array<string> | { $not: string | Array<string> }} FilterStringValue
*/

/**
 * @typedef { number | Array<number> | { $not: number | Array<number> } | { $gt?: number, $gte?: number, $lt?: number, $lte?: number }} FilterNumberValue
*/

const FilterStringValueIO = t.union([t.string, t.array(t.string)]);
const FilterStringQueryIO = t.union([FilterStringValueIO, t.type({ $not: FilterStringValueIO })]);

const FilterNumberValueIO = t.union([t.number, t.array(t.number)]);
const FilterNumberQueryIO = t.union([
  FilterNumberValueIO,
  t.type({ $not: FilterNumberValueIO }),
  t.partial({
    $gt: t.number,
    $gte: t.number,
    $lt: t.number,
    $lte: t.number,
  }),
]);

const FindFilterIO = t.record(t.string, t.union([FilterStringQueryIO, FilterNumberQueryIO]), 'FindFilter');

module.exports = {
  FindFilterIO,
};
