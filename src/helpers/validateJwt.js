const jwt = require('jsonwebtoken');

module.exports = function validateJwt(token) {
    return new Promise(function (resolve, reject) {
        jwt.verify(token, process.env.JWT_PRIVATE, function (err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};
