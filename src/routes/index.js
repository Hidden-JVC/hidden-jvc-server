const router = require('express').Router();

const users = require('./users.js');
const topics = require('./topics.js');

router.use('/users', users);
router.use('/topics', topics);

module.exports = router;
