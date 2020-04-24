const { sqlLogger } = require('../logger.js');

module.exports = function (debug) {
    if (debug) {
        return function () {
            sqlLogger.info(this.toString());
        };
    } else {
        return function () { };
    }
};
