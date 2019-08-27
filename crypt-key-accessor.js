class CryptKeyAccessor {
    constructor(getKeySecurely) {
        this._getKeySecurely = getKeySecurely;
     }
    
    /**
     * Summary.
     * 
     * Description.
     * 
     * @since 0.2.8
     * @param {function(secretKey)} useKeySecurelyCallback Only the key as a string will be passed into this callback Ensure the key is never leaked outside due to closure.
     */
    secureAccessor(useKeySecurelyCallback) {
        let key = {
            "closedOver": this._getKeySecurely()
        };

        useKeySecurelyCallback(key.closedOver);
        delete key.closedOver;
    }
}

module.exports = CryptKeyAccessor