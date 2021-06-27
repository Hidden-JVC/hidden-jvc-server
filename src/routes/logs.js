const router = require('express').Router();

const database = require('../database.js');
const { computePagination } = require('../helpers');

// /logs/moderation
router.get('/moderation', async (req, res, next) => {
    try {
        let { userId, forumId, jvcTopicId, hiddenTopicId } = req.query;

        const { offset, limit } = computePagination(req.query.page, req.query.limit, 20);

        const projection = database.raw(`
            json_build_object(
                'ModerationLog', "ModerationLog".*,
                'User', json_build_object (
                    'Name', "User"."Name"
                )
            ) as json
        `);

        const result = await database
            .select(projection)
            .from('ModerationLog')
            .innerJoin('User', 'ModerationLog.UserId', '=', 'User.Id')
            .where(conditions)
            .orderBy('ModerationLog.Date', 'DESC')
            .offset(offset)
            .limit(limit);

        const logs = result.map((row) => row.json);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('ModerationLog')
            .where(conditions);

        /* eslint-disable-next-line no-inner-declarations */
        function conditions(query) {
            if (userId) {
                query.where('ModerationLog.UserId', '=', userId);
            }

            if (forumId) {
                query.where('ModerationLog.ForumId', '=', forumId);
            }

            if (jvcTopicId) {
                query.where('ModerationLog.JVCTopicId', '=', jvcTopicId);
            }

            if (hiddenTopicId) {
                query.where('ModerationLog.HiddenTopicId', '=', hiddenTopicId);
            }
        }

        res.json({ logs, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
