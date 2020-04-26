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

        const query = database
            .from('Post')
            .where(conditions);

        const [{ posts }] = await query.clone()
            .select(database.raw(`COALESCE(json_agg(
                json_build_object(
                    'post', "Post".*,
                    'user', CASE WHEN "User"."Id" IS NOT NULL
                        THEN json_build_object(
                            'Id', "User"."Id",
                            'Name', "User"."Name"
                        )
                        ELSE NULL END
                ) ORDER BY "Post"."CreationDate" DESC
            ), '[]') as posts`))
            .from('Post')
            .leftJoin('User', 'User.Id', 'Post.UserId')
            .limit(pagination.limit)
            .offset(pagination.offset)
            .on('query', sqlLogger(debug));

        const [{ count }] = await query.clone()
            .select(database.raw('count(*)::integer'))
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
