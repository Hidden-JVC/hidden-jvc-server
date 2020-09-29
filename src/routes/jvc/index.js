const router = require('express').Router();

const forums = require('./forums.js');
const topics = require('./topics.js');
const moderation = require('./moderation.js');

router.use('/forums', forums);
router.use('/topics', topics);
router.use('/moderation', moderation);

module.exports = router;
