class CryptKeyAccessor {
    constructor(getKeySecurely) {
        this._getKeySecurely = getKeySecurely;
     }
    
    /**
     * Summary.
     *
     * Description.
     * 
     * @since 0.4.0
     * @return Promise which resolve to key string
     */
    secureAccessor() {
        return new Promise((resolve, reject) => {
            let key = {
                "closedOver": this._getKeySecurely()
            };
            if (typeof key.closedOver.then === 'function') {
                key.closedOver.then(resolve).catch(reject);
                delete key.closedOver;
            } else {
                resolve(key.closedOver);
                delete key.closedOver;
            }
        })
    }
}

module.exports = CryptKeyAccessor