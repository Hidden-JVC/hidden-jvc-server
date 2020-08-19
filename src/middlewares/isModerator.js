const database = require('../database.js');

module.exports = async function (req, res, next) {
    try {
        const { userId } = res.locals;

        const [user] = await database
            .select('IsAdmin')
            .from('User')
            .where('Id', '=', userId);

        const [moderator] = await database
            .select(database.raw('array_to_json("Actions") as "Actions"'))
            .from('Moderator')
            .where('UserId', '=', userId);

        res.locals.isAdmin = user.IsAdmin;
        if (typeof moderator === 'object') {
            res.locals.actions = moderator.Actions;
        } else {
            res.locals.actions = [];
        }

        const isModerator = (typeof moderator === 'object') || user.IsAdmin;

        if (isModerator) {
            next();
        } else {
            next(new Error('you must be a moderator'));
        }
    } catch (err) {
        next(err);
    }
};
