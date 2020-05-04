const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger } = require('../helpers');

// /topics
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const pagination = parsePagination(req.query, 'Topic.CreationDate', 1, 20, 'DESC');

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
        const { title, username, rawContent, compiledContent } = req.body;

        if (typeof rawContent !== 'string' || rawContent.length === 0) {
            throw new Error('invalid arguments');
        }

        if (typeof compiledContent !== 'string' || compiledContent.length === 0) {
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
                .insert({ RawContent: rawContent, CompiledContent: compiledContent, TopicId: topicId, UserId: userId })
                .into('Post');

            res.json({ topicId });
        } else if (username) {
            const [topicId] = await database
                .insert({ Title: title, Username: username }, 'Id')
                .into('Topic');

            await database
                .insert({ RawContent: rawContent, CompiledContent: compiledContent, TopicId: topicId, Username: username })
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

router.post('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        const { rawContent, compiledContent, userId, username } = req.body;

        if (typeof rawContent !== 'string' || rawContent.length === 0) {
            throw new Error('invalid arguments');
        }

        if (typeof compiledContent !== 'string' || compiledContent.length === 0) {
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
                .insert({ RawContent: rawContent, CompiledContent: compiledContent, TopicId: topicId, UserId: userId }, 'Id')
                .into('Post');

            res.json({ postId });
        } else if (username) {
            const [postId] = await database
                .insert({ RawContent: rawContent, CompiledContent: compiledContent, TopicId: topicId, Username: username }, 'Id')
                .into('Post');

            res.json({ postId });
        } else {
            throw new Error('you must provide a userId or a usernale');
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
