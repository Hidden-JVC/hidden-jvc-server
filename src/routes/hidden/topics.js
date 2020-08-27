const router = require('express').Router();

const HiddenController = require('../../controllers/HiddenController.js');

// /hidden/topics
router.get('/', async (req, res, next) => {
    try {
        let { forumId, page, startDate, endDate } = req.query;
        const data = { page, forumId, startDate, endDate };

        const { topics, count } = await HiddenController.getTopics(data);
        res.json({ topics, count });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics
router.post('/', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { title, content, forumId } = req.body;
        const data = { title, content, forumId, userId };

        const { topicId } = await HiddenController.createTopic(data);
        res.json({ topicId });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        let { userId, page } = req.query;
        const data = { topicId, userId, page };

        const { topic } = await HiddenController.getTopic(data);
        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

// /hidden/topics/:topicId
router.post('/:topicId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;
        const { content } = req.body;
        const data = { userId, topicId, content };

        const { postId } = await HiddenController.createPost(data);
        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
