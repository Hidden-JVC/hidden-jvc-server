const router = require('express').Router();

const { authRequired } = require('../middlewares');
const UserController = require('../controllers/UserController.js');

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

// /users
router.get('/', async (req, res, next) => {
    try {
        res.json({ users: [] });
    } catch (err) {
        next(err);
    }
});

// /users:userId
router.get('/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const data = { userId: parseInt(userId) };
        const user = await UserController.getUser(data);

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

// /users:userId
router.post('/:userId', authRequired, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { userId: connectedUserId } = res.locals;
        const { email, signature, profilePicture } = req.body;
        // const 
        const data = { userId: parseInt(userId), email, signature, profilePicture, connectedUserId };
        await UserController.updateUser(data);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
