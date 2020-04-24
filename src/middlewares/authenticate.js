const jwt = require('jsonwebtoken');

const database = require('../database.js');

function validateJwt(token) {
    return new Promise(function (resolve, reject) {
        jwt.verify(token, process.env.JWT_PRIVATE, function (err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

module.exports = async function (req, res, next) {
    try {
        const { authorization } = req.headers;
        if (authorization) {
            const [, token] = authorization.split(' ');
            const { userId, userName, sessionId } = await validateJwt(token);

            const [session] = await database
                .select('*')
                .from('Session')
                .where('Id', '=', sessionId)
                .where('UserId', '=', userId);

            if (!session) {
                return next(new Error('your session has expired'));
            }

            res.locals.userId = userId;
            res.locals.userName = userName;
            res.locals.sessionId = sessionId;
        }
        next();
    } catch (err) {
        next(err);
    }
};
