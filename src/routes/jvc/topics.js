const router = require('express').Router();

const JVCController = require('../../controllers/JVCController.js');

// List of jvc topics with at least one hidden post
// /jvc/topics
router.get('/', async (req, res, next) => {
    try {
        const { topicIds } = req.query;
        const data = { topicIds };

        const topics = await JVCController.getTopics(data);
        res.json({ topics });
    } catch (err) {
        next(err);
    }
});

// Creation of an hidden jvc post on a real jvc topic
// /jvc/topics/:topicId
router.post('/:topicId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;
        const { forumId, viewId, content, page, username } = req.body;
        const data = { userId, topicId: parseInt(topicId), forumId, viewId, content, page, username };

        const { postId } = await JVCController.createPost(data);
        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

// /jvc/topics/:topicId
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        let { startDate, endDate } = req.query;
        const data = { topicId, startDate, endDate };

        const topic = await JVCController.getTopic(data);
        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

// /jvc/topics/:topicId/:postId
router.post('/:topicId/:postId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { postId } = req.params;
        const { content } = req.body;
        const data = { userId, postId: parseInt(postId), content };
        await JVCController.updatePost(data);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
