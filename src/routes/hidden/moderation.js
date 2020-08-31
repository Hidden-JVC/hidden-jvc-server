const router = require('express').Router();

const { authRequired } = require('../../middlewares');
const HiddenController = require('../../controllers/HiddenController.js');

// /hidden/moderation/topics
router.post('/topics', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { action, ids } = req.body;

        await HiddenController.topicModeration(action, ids, userId);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// /hidden/moderation/posts
router.post('/posts', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { action, ids } = req.body;

        await HiddenController.postModeration(action, ids, userId);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
