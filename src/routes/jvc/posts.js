const router = require('express').Router();

const { authRequired } = require('../../middlewares');
const JVCController = require('../../controllers/JVCController.js');

// /jvc/posts/:postId
router.post('/:postId', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { postId } = req.params;
        const { content } = req.body;

        await JVCController.updatePost({
            userId, postId, content
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// /jvc/posts/postId
router.delete('/:postId', authRequired, async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { userId } = res.locals;

        await JVCController.deletePost({
            userId, postId
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
