const bcrypt = require('bcrypt');
const router = require('express').Router();

const database = require('../database.js');
const { createJWT } = require('../helpers');

// /users/register
router.post('/register', async (req, res, next) => {
    try {
        const { name, password } = req.body;
        if (typeof name !== 'string' || typeof password !== 'string') {
            return next(new Error('you must provide both a name and a password'));
        }

        const [existingUser] = await database
            .select('*')
            .from('User')
            .where('Name', '=', name);

        if (existingUser) {
            throw new Error('Ce pseudo est déjà pris');
        }

        const hash = await bcrypt.hash(password, 10);

        const values = {
            Name: name,
            Password: hash
        };

        const [userId] = await database
            .insert(values, 'Id')
            .into('User');

        const [sessionId] = await database
            .insert({ UserId: userId }, 'Id')
            .into('Session');

        const jwt = await createJWT(userId, name, sessionId);

        res.json({ jwt });
    } catch (err) {
        next(err);
    }
});

// /users/login
router.post('/login', async (req, res, next) => {
    try {
        const { name, password } = req.body;
        if (typeof name !== 'string' || typeof password !== 'string') {
            return next(new Error('you must provide both a name and a password'));
        }

        const [user] = await database
            .select(['Id', 'Name', 'Password', 'IsAdmin'])
            .from('User')
            .where('Name', '=', name);

        if (!user) {
            return next(new Error('invalid name or password'));
        }

        const match = await bcrypt.compare(password, user.Password);

        if (!match) {
            return next(new Error('invalid name or password'));
        }

        const [moderator] = await database
            .select('*')
            .from('Moderator')
            .where('UserId', '=', user.Id);

        await database('Session')
            .where('UserId', '=', user.Id)
            .del();

        const [sessionId] = await database
            .insert({ UserId: user.Id }, 'Id')
            .into('Session');

        const jwt = await createJWT(user.Id, user.Name, sessionId);

        const isModerator = (typeof moderator === 'object') || user.IsAdmin;

        res.json({ jwt, isModerator });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
