const jwt = require('jsonwebtoken');

module.exports = function (userId, userName, sessionId) {
    return new Promise(function (resolve, reject) {
        const payload = { userId, userName, sessionId };
        jwt.sign(payload, process.env.JWT_PRIVATE, { expiresIn: '1 day' }, function (err, token) {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
};
