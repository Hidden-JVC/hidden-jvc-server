module.exports = function (req, res, next) {
    const { userId } = res.locals;
    if (userId) {
        next();
    } else {
        next(new Error('authentication required'));
    }
};
