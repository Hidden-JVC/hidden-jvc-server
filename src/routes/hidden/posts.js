const router = require('express').Router();

const { authRequired } = require('../../middlewares');
const HiddenController = require('../../controllers/HiddenController.js');

// /hidden/posts - create post
router.post('/', authRequired, async (req, res, next) => {
    try {
        const { userId, ip } = res.locals;
        const { content, topicId, postId } = req.body;

        const { postId: createdPostId } = await HiddenController.createPost({
            userId, content, topicId, postId, ip
        });
        res.json({ postId: createdPostId });
    } catch (err) {
        next(err);
    }
});

// /hidden/posts/:postId/quotes - get posts quotes history
router.get('/:postId/quotes', async (req, res, next) => {
    try {
        const { postId } = req.params;

        const { posts } = await HiddenController.getPostQuotes({
            postId: parseInt(postId)
        });

        res.json({ posts });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
