const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger } = require('../helpers');

// /topics
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const pagination = parsePagination(req.query, 'Topic.CreationDate', 1, 5, 'DESC');

        const conditions = function () {

        };

        const result = await database
            .select('Json')
            .from('TopicListJson')
            .where(conditions)
            .limit(pagination.limit)
            .offset(pagination.offset)
            .on('query', sqlLogger(debug));

        const topics = result.map((r) => r.Json);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('Topic')
            .where(conditions)
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
        if (typeof title !== 'string' || title.length === 0) {
            throw new Error('invalid arguments');
        }
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

        const [{ Json: topic }] = await database
            .select('Json')
            .from('TopicPostsJson')
            .where('Id', '=', topicId);

        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
