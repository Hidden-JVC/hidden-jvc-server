const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger } = require('../helpers');

// /topics
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;

        req.query.limit = 20;
        const pagination = parsePagination(req.query, 'Topic.CreationDate', 1, 20, 'DESC');

        const topics = [];

        if (pagination.page === 1) {
            const result = await database
                .select('*')
                .from(database.raw('"TopicListJson"(?, ?, ?)', [true, 0, 5]))
                .on('query', sqlLogger(debug));

            result.forEach((row) => topics.push(row.TopicListJson));
        }

        const result = await database
            .select('*')
            .from(database.raw('"TopicListJson"(?, ?, ?)', [false, pagination.offset, 20]))
            .on('query', sqlLogger(debug));

        result.forEach((row) => topics.push(row.TopicListJson));

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('Topic')
            .on('query', sqlLogger(debug));

        res.json({ topics, count });
    } catch (err) {
        next(err);
    }
});

// /topics
router.post('/', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { title, username, content } = req.body;

        if (typeof content !== 'string' || content.length === 0) {
            throw new Error('invalid arguments');
        }

        if (userId) {
            const [user] = await database
                .select('*')
                .from('User')
                .where('Id', '=', userId);

            if (!user) {
                throw new Error('aze');
            }

            const [topicId] = await database
                .insert({ Title: title, UserId: userId }, 'Id')
                .into('Topic');

            await database
                .insert({ Content: content, TopicId: topicId, UserId: userId })
                .into('Post');

            res.json({ topicId });
        } else if (username) {
            const [topicId] = await database
                .insert({ Title: title, Username: username }, 'Id')
                .into('Topic');

            await database
                .insert({ Content: content, TopicId: topicId, Username: username })
                .into('Post');

            res.json({ topicId });
        } else {
            throw new Error('you must provide a userId or a username');
        }
    } catch (err) {
        next(err);
    }
});

router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;

        req.query.limit = 20;
        const pagination = parsePagination(req.query, 'Json', 1, 20, 'ASC');

        const [{ TopicPostsJson: topic }] = await database
            .select('*')
            .from(database.raw('"TopicPostsJson"(?, ?, 20)', [topicId, pagination.offset]));

        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

router.post('/:topicId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;
        const { content, username } = req.body;

        if (typeof content !== 'string' || content.length === 0) {
            throw new Error('invalid arguments');
        }

        const [topic] = await database
            .select('*')
            .from('Topic')
            .where('Id', '=', topicId);

        if (!topic) {
            throw new Error('aze');
        }

        if (userId) {
            const [user] = await database
                .select('*')
                .from('User')
                .where('Id', '=', userId);

            if (!user) {
                throw new Error('aze');
            }

            const [postId] = await database
                .insert({ Content: content, TopicId: topicId, UserId: userId }, 'Id')
                .into('Post');

            res.json({ postId });
        } else if (username) {
            const [postId] = await database
                .insert({ Content: content, TopicId: topicId, Username: username }, 'Id')
                .into('Post');

            res.json({ postId });
        } else {
            throw new Error('you must provide a userId or a username');
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
