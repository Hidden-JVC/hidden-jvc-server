const router = require('express').Router();

const topics = require('./topics.js');
const posts = require('./posts.js');
const moderation = require('./moderation.js');

router.use('/topics', topics);
router.use('/posts', posts);
router.use('/moderation', moderation);

module.exports = router;
