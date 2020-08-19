const router = require('express').Router();

const database = require('../../database.js');
const { isModerator, authRequired } = require('../../middlewares');

// /jvc/moderation/posts
router.post('/posts', authRequired, isModerator, async (req, res, next) => {
    try {
        const { isAdmin, actions } = res.locals;
        const { action, ids } = req.body;

        if (!Array.isArray(ids)) {
            return new Error('ids must be an array');
        }

        if (!isAdmin && !actions.includes(action)) {
            return next(new Error('you don\'t have the right to perform this action'));
        }

        switch (action) {
            case 'DeletePost':
                await database('JVCPost')
                    .del()
                    .whereIn('Id', ids);
                break;
            default:
                return next(new Error('unknown action'));
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
