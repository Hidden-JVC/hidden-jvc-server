const router = require('express').Router();

const database = require('../../database.js');
const { parsePagination, sqlLogger } = require('../../helpers');

// /topics/hidden
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const { forumId } = req.query;

        req.query.limit = 20;
        const pagination = parsePagination(req.query, 'TopicListJson', 1, 20, 'DESC');

        const topics = [];

        if (pagination.page === 1) {
            // pinned topics
            const result = await database
                .select('*')
                .from(database.raw('"HiddenTopicListJson"(?, ?, ?, ?)', [forumId, true, 0, 5]))
                .on('query', sqlLogger(debug));

            result.forEach((row) => topics.push(row.HiddenTopicListJson));
        }

        const result = await database
            .select('*')
            .from(database.raw('"HiddenTopicListJson"(?, ?, ?, ?)', [forumId, false, pagination.offset, 20]))
            .on('query', sqlLogger(debug));

        result.forEach((row) => topics.push(row.HiddenTopicListJson));

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('HiddenTopic')
            .on('query', sqlLogger(debug));

        res.json({ topics, count });
    } catch (err) {
        next(err);
    }
});

// /topics/hidden
router.post('/', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topic, post } = req.body;

        if (typeof topic !== 'object') {
            throw new Error('topic est requis');
        }

        if (typeof post !== 'object') {
            throw new Error('post est requis');
        }

        if (typeof topic.title !== 'string' || topic.title.length === 0) {
            throw new Error('topic.title est requis');
        }

        if (typeof post.content !== 'string' || post.content.length === 0) {
            throw new Error('post.content est requis');
        }

        if (typeof topic.forumId !== 'number') {
            throw new Error('topic.forumId est requis');
        }

        const topicData = {
            Title: topic.title,
            JVCForumId: topic.forumId
        };

        const postData = {
            Content: post.content
        };

        if (userId) {
            topicData.UserId = userId;
            postData.UserId = userId;
        } else if (topic.username) {
            topicData.Username = topic.username;
            postData.Username = topic.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ post.username');
        }

        const [jvcForum] = await database
            .select('*')
            .from('JVCForum')
            .where('Id', '=', topic.forumId);

        // check name validity
        if (!jvcForum) {
            await database
                .insert({ Id: topic.forumId, Name: topic.forumName })
                .into('JVCForum');
        }

        const [topicId] = await database
            .insert(topicData, 'Id')
            .into('HiddenTopic');

        postData.HiddenTopicId = topicId;

        await database
            .insert(postData)
            .into('HiddenPost');

        res.json({ topicId });
    } catch (err) {
        next(err);
    }
});

// /topics/hidden/:topicId
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;

        req.query.limit = 20;
        const pagination = parsePagination(req.query, 'Json', 1, 20, 'ASC');

        const [{ HiddenTopicPostsJson: topic }] = await database
            .select('*')
            .from(database.raw('"HiddenTopicPostsJson"(?, ?, 20)', [topicId, pagination.offset]));

        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

// /topics/hidden/:topicId
router.post('/:topicId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;
        const { post } = req.body;

        if (typeof post !== 'object') {
            throw new Error('post est requis');
        }

        if (typeof post.content !== 'string') {
            throw new Error('post.content est requis');
        }

        const postData = {
            Content: post.content,
            HiddenTopicId: topicId
        };

        if (userId) {
            postData.UserId = userId;
        } else if (typeof post.username === 'string') {
            postData.Username = post.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ post.username');
        }

        const [topic] = await database
            .select('*')
            .from('HiddenTopic')
            .where('Id', '=', topicId);

        if (!topic) {
            throw new Error(`Le topic avec l'id: ${topicId} est introuvable`);
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('HiddenPost');

        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
