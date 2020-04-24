const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger } = require('../helpers');

// /topics
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const pagination = parsePagination(req.query, 'CreationDate', 1, 5, 'DESC');

        const conditions = function () {
            const { title } = req.query;
            if (typeof title === 'string') {
                this.where('Type', 'like', `%${title}%`);
            }
        };

        const query = database
            .from('Topic')
            .where(conditions);

        const topics = await query.clone()
            .select('*')
            .orderBy(pagination.sort, pagination.order)
            .limit(pagination.limit)
            .offset(pagination.offset)
            .on('query', sqlLogger(debug));

        const [{ count }] = await query.clone()
            .select(database.raw('count(*)::integer'))
            .on('query', sqlLogger(debug));

        res.json({ topics, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
