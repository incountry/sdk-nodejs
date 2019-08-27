module.exports = async function forEachAsync(array, callback) {
    let promises = [];
    for (let index = 0; index < array.length; index++) {
    // Need to add 0 to index to ensure the index is not closed over, giving unexpected results.
        promises.push(callback(array[index], (index + 0), array));
    }

    return Promise.all(promises);
}