const router = require('express').Router();

const JVCController = require('../../controllers/JVCController.js');
const { authRequired } = require('../../middlewares');

// /jvc/topics
router.get('/', async (req, res, next) => {
    try {
        const { topicIds } = req.query;

        const topics = await JVCController.getTopics({
            topicIds
        });
        res.json({ topics });
    } catch (err) {
        next(err);
    }
});

// /jvc/topics/:topicId
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        const { startDate, endDate, debug } = req.query;

        const { forum, topic, posts, pages, queries } = await JVCController.getTopic({
            topicId, startDate, endDate, debug
        });
        res.json({ forum, topic, posts, pages, queries });
    } catch (err) {
        next(err);
    }
});

// /jvc/topics/:topicId
router.post('/:topicId', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;
        const { forumId, forumName, viewId, content, page, topicTitle, topicDate, topicContent, topicAuthor } = req.body;

        const { postId } = await JVCController.createPost({
            forumId, forumName, viewId,
            topicId, topicTitle, topicDate, topicContent, topicAuthor,
            userId, content, page
        });
        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
