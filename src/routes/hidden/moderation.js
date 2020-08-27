const router = require('express').Router();

const database = require('../../database.js');
const { isModerator, authRequired } = require('../../middlewares');

// /hidden/moderation/topics
router.post('/topics', authRequired, isModerator, async (req, res, next) => {
    try {
        const { isAdmin, actions } = res.locals;
        const { action, ids } = req.body;

        if (!Array.isArray(ids)) {
            return next(new Error('ids must be an array'));
        }

        if (!isAdmin && !actions.includes(action)) {
            return next(new Error('you don\'t have the right to perform this action'));
        }

        switch (action) {
            case 'Pin':
                await database('HiddenTopic')
                    .update({ Pinned: true })
                    .whereIn('Id', ids);
                break;

            case 'UnPin':
                await database('HiddenTopic')
                    .update({ Pinned: false })
                    .whereIn('Id', ids);
                break;

            case 'Lock':
                await database('HiddenTopic')
                    .update({ Locked: true })
                    .whereIn('Id', ids);
                break;

            case 'UnLock':
                await database('HiddenTopic')
                    .update({ Locked: false })
                    .whereIn('Id', ids);
                break;

            case 'DeleteTopic':
                await database('HiddenTopic')
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

// /hidden/moderation/posts
router.post('/posts', authRequired, isModerator, async (req, res, next) => {
    try {
        const { userId, isAdmin, actions } = res.locals;
        const { action, ids } = req.body;

        if (!Array.isArray(ids)) {
            return new Error('ids must be an array');
        }

        if (!isAdmin && !actions.includes(action)) {
            return next(new Error('you don\'t have the right to perform this action'));
        }

        switch (action) {
            case 'Pin':
                await database('HiddenPost')
                    .update({ Pinned: true })
                    .whereIn('Id', ids);
                break;

            case 'UnPin':
                await database('HiddenPost')
                    .update({ Pinned: false })
                    .whereIn('Id', ids);
                break;

            case 'DeletePost':
                await database('HiddenPost')
                    .del()
                    .whereIn('Id', ids);
                break;
            default:
                return next(new Error('unknown action'));
        }

        // await database
        //     .insert({ Action: action, UserId: userId })
        //     .into('ModerationLog');

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
