const router = require('express').Router();

const database = require('../database.js');
const { parsePagination } = require('../helpers');

// /forums
router.get('/', async (req, res, next) => {
    try {
        req.query.limit = 20;
        const pagination = parsePagination(req.query, 'Json', 1, 20, 'ASC');

        const result = await database
            .select('*')
            .from(database.raw('"JVCForumListJson"(?, 20)', [pagination.offset]));

        const forums = result.map((row) => row.JVCForumListJson);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('JVCForum');

        res.json({ forums, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
