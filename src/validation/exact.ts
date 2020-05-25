import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

const getExtraProps = (props: Record<string, any>, r: Record<string, any>): string[] => Object.keys(r).filter((k) => !Object.prototype.hasOwnProperty.apply(props, [k]));

const exact = <P, A, >(codec: t.InterfaceType<P, A> | t.PartialType<P, A>): t.InterfaceType<P, A> => new t.InterfaceType(
  codec.name,
  codec.is,
  (i, c) => either.chain(t.UnknownRecord.validate(i, c), (r) => {
    const ex = getExtraProps(codec.props, r);
    return ex.length > 0
      ? t.failure(i, c)
      : codec.validate(i, c);
  }),
  codec.encode,
  codec.props,
);

export {
  exact,
};
