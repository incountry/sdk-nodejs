const t = require('io-ts');
const { either } = require('fp-ts/lib/Either');

const getExcessProps = (props, r) => Object.keys(r).filter((k) => !Object.prototype.hasOwnProperty.apply(props, [k]));

const excess = (codec) => new t.InterfaceType(
  codec.name,
  codec.is,
  (i, c) => either.chain(t.UnknownRecord.validate(i, c), (r) => {
    const ex = getExcessProps(codec.props, r);
    return ex.length > 0
      ? t.failure(i, c)
      : codec.validate(i, c);
  }),
  codec.encode,
  codec.props,
);

module.exports = {
  excess,
};
