const router = require('express').Router();

const HiddenController = require('../../controllers/HiddenController.js');
const { authRequired } = require('../../middlewares');

// /hidden/topics - topic list
router.get('/', async (req, res, next) => {
    try {
        let { forumId, page, limit, startDate, endDate, pinned, searchTitle, searchUserId, searchTagIds, debug } = req.query;

        const { forum, topics, count } = await HiddenController.getTopics({
            forumId, page, limit, startDate, endDate, pinned, searchTitle, searchUserId, searchTagIds, debug
        });
        res.json({ forum, topics, count });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics - topic creation
router.post('/', authRequired, async (req, res, next) => {
    try {
        const { userId, ip } = res.locals;
        const { title, tags, content, forumId, forumName } = req.body;
        const data = { title, tags, content, forumId, forumName, userId, ip };

        const { topicId } = await HiddenController.createTopic(data);
        res.json({ topicId });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId - get single topic
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        const { userId, page, debug } = req.query;
        const data = { topicId, userId, page, debug };

        const { forum, topic, posts, request } = await HiddenController.getTopic(data);
        res.json({ forum, topic, posts, request });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId - update topic
router.post('/:topicId', authRequired, async (req, res, next) => {
    try {
        const { topicId } = req.params;
        const { userId } = res.locals;
        const { title, tags } = req.body;
        const data = { topicId: parseInt(topicId), userId, title, tags };

        await HiddenController.updateTopic(data);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId/posts/:postId - update posts
router.post('/:topicId/posts/:postId', authRequired, async (req, res, next) => {
    try {
        const { userId, ip } = res.locals;
        const { postId } = req.params;
        const { content, pinned } = req.body;
        const data = { userId, postId: parseInt(postId), content, pinned, ip };
        if (typeof content === 'string') {
            await HiddenController.updatePostContent(data);
        } else if (typeof pinned === 'boolean') {
            await HiddenController.updatePostPinned(data);
        } else {
            return res.json({ success: false });
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
