function toPromise(validation) {
  return new Promise((resolve, reject) => (
    validation._tag === 'Left'
      ? reject(validation.left)
      : resolve(validation.right)
  ));
}

module.exports = {
  toPromise,
};
