const router = require('express').Router();

const jvc = require('./jvc');
const logs = require('./logs.js');
const hidden = require('./hidden');
const users = require('./users.js');
const forums = require('./forums.js');
const notifications = require('./notifications.js');

router.use('/jvc', jvc);
router.use('/logs', logs);
router.use('/hidden', hidden);
router.use('/users', users);
router.use('/forums', forums);
router.use('/notifications', notifications);

module.exports = router;
