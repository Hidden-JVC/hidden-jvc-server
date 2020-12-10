const router = require('express').Router();

const database = require('../database.js');
const { parsePagination } = require('../helpers');

// /logs/moderation
router.get('/moderation', async (req, res, next) => {
    try {
        let { userId } = req.query;
        if (userId) {
            userId = parseInt(userId);
        } else {
            userId = null;
        }

        const pagination = parsePagination(req.query, 'Json', 1, 20, 'ASC');

        pagination.limit = Math.min(Math.max(pagination.limit, 1), 100);

        const result = await database
            .select('*')
            .from(database.raw('"ModerationLogJson"(?, ?, ?)', [pagination.offset, pagination.limit, userId]));

        const logs = result.map((row) => row.ModerationLogJson);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('ModerationLog');

        res.json({ logs, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
