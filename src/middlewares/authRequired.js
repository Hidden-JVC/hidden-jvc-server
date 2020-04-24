module.exports = function (req, res, next) {
    const { sessionId } = res.locals;
    if (sessionId) {
        next();
    } else {
        next(new Error('authentication required'));
    }
};
