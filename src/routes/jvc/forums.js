const router = require('express').Router();

const JVCController = require('../../controllers/JVCController.js');

// /jvc/forums/:forumId
router.get('/:forumId', async (req, res, next) => {
    try {
        const { forumId } = req.params;
        const data = { forumId: parseInt(forumId) };

        const forum = await JVCController.getForum(data);
        res.json({ forum });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
