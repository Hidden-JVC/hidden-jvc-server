const router = require('express').Router();

const NotificationsController = require('../controllers/NotificationsController.js');

// /notifications/delete
router.post('/delete', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        let { notifications } = req.body;

        await NotificationsController.deleteNotifications({ notifications, userId });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
