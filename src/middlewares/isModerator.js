const database = require('../database.js');

module.exports = async function (req, res, next) {
    try {
        const { userId } = res.locals;

        const [user] = await database
            .select('*')
            .from('User')
            .where('Id', '=', userId);

        if (user && (user.Type === 'Moderator' || user.Type === 'Admin')) {
            next();
        } else {
            next(new Error('you must be a moderator'));
        }
    } catch (err) {
        next(err);
    }
};
