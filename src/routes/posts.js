const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger } = require('../helpers');

// /posts
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const pagination = parsePagination(req.query, 'Post.CreationDate', 1, 5, 'DESC');

        const conditions = function () {
            const { topicId } = req.query;
            if (typeof topicId === 'string') {
                this.where('TopicId', '=', topicId);
            }
        };

        const result = await database
            .select('json')
            .from('PostJSON')
            .where(conditions)
            .limit(pagination.limit)
            .offset(pagination.offset)
            .on('query', sqlLogger(debug));

        const posts = result.map((r) => r.json);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('Post')
            .where(conditions)
            .on('query', sqlLogger(debug));

        res.json({ posts, count });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { content, topicId, userId, username } = req.body;

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
            throw new Error('you must provide a userId or a usernale');
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
