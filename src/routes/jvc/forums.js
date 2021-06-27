const router = require('express').Router();

const JVCController = require('../../controllers/JVCController.js');

// /jvc/forums/:forumId
router.get('/:forumId', async (req, res, next) => {
    try {
        const { forumId } = req.params;
        const { topicIds, startDate, endDate, debug } = req.query;

        const { forum, jvcTopics, pinnedHiddenTopics, inBetweenHiddenTopics, lastHiddenTopics, queries } = await JVCController.getForum({
            forumId, topicIds, startDate, endDate, debug
        });
        res.json({ forum, jvcTopics, pinnedHiddenTopics, inBetweenHiddenTopics, lastHiddenTopics, queries });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
