const database = require('../database.js');
const validateJwt = require('../helpers/validateJwt');

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
