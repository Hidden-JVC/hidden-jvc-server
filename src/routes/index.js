const router = require('express').Router();

const users = require('./users.js');
const forums = require('./forums.js');
const jvcTopics = require('./jvc/topics.js');
const hiddenTopics = require('./hidden/topics.js');

router.use('/users', users);
router.use('/forums', forums);
router.use('/jvc/topics', jvcTopics);
router.use('/hidden/topics', hiddenTopics);

module.exports = router;
