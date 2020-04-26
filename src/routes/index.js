const router = require('express').Router();

const posts = require('./posts.js');
const users = require('./users.js');
const topics = require('./topics.js');

router.use('/posts', posts);
router.use('/users', users);
router.use('/topics', topics);

module.exports = router;
