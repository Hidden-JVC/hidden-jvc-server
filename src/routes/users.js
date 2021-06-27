const router = require('express').Router();

const { authRequired } = require('../middlewares');
const UserController = require('../controllers/UserController.js');

// /users
router.get('/', async (req, res, next) => {
    try {
        const { name } = req.query;
        const data = { name };
        const { users, count } = await UserController.getUsers(data);
        res.json({ users, count });
    } catch (err) {
        next(err);
    }
});

// /users/register
router.post('/register', async (req, res, next) => {
    try {
        const { name, password } = req.body;
        const data = { name, password };
        const { jwt, userId, isAdmin, moderators } = await UserController.register(data);

        res.json({ jwt, userId, isAdmin, moderators });
    } catch (err) {
        next(err);
    }
});

// /users/login
router.post('/login', async (req, res, next) => {
    try {
        const { name, password } = req.body;
        const data = { name, password };
        const { jwt, userId, isAdmin, moderators } = await UserController.login(data);

        res.json({ jwt, userId, isAdmin, moderators });
    } catch (err) {
        next(err);
    }
});

// /users/me
router.get('/me', authRequired, async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { user, notifications } = await UserController.me({ userId });

        res.json({ user, notifications });
    } catch (err) {
        next(err);
    }
});

// /users/moderation
router.post('/moderation', authRequired, async (req, res, next) => {
    try {
        const { userId: connectedUserId } = res.locals;
        const { action, userId } = req.body;
        const data = { connectedUserId, action, userId };
        await UserController.moderation(data);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// /users/:userName
router.get('/:userName', async (req, res, next) => {
    try {
        const { userName } = req.params;
        const { debug } = req.query;
        const data = { userName, debug };
        const { user } = await UserController.getUser(data);

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

// /users/:userId
router.post('/:userId', authRequired, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { userId: connectedUserId } = res.locals;
        const { email, signature, profilePicture } = req.body;
        const data = { userId: parseInt(userId), email, signature, profilePicture, connectedUserId };
        await UserController.updateUser(data);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
