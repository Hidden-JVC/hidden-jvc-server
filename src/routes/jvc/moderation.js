const router = require('express').Router();

const { authRequired } = require('../../middlewares');
const JVCController = require('../../controllers/JVCController.js');

// /jvc/moderation/posts
router.post('/posts', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { action, ids } = req.body;

        await JVCController.postModeration(action, ids, userId);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
