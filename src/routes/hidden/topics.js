const router = require('express').Router();

const HiddenController = require('../../controllers/HiddenController.js');

// /hidden/topics - topic list
router.get('/', async (req, res, next) => {
    try {
        let { forumId, page, startDate, endDate, pinned, search, searchType } = req.query;
        const data = { forumId, page, startDate, endDate, pinned, search, searchType };

        const { topics, count } = await HiddenController.getTopics(data);
        res.json({ topics, count });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics - topic creation
router.post('/', async (req, res, next) => {
    try {
        const { userId, ip } = res.locals;
        const { title, tags, content, username, forumId, forumName } = req.body;
        const data = { title, tags, content, username, forumId, forumName, userId, ip };

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
        const { userId, page } = req.query;
        const data = { topicId, userId, page };

        const { topic } = await HiddenController.getTopic(data);
        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId - update topic
router.post('/:topicId', async (req, res, next) => {
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

// /hidden/topics/:topicId/posts - create post
router.post('/:topicId/posts', async (req, res, next) => {
    try {
        const { userId, ip } = res.locals;
        const { topicId } = req.params;
        const { content, username } = req.body;
        const data = { userId, topicId, content, username, ip };

        const { postId } = await HiddenController.createPost(data);
        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId/posts/:postId - update posts
router.post('/:topicId/posts/:postId', async (req, res, next) => {
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
