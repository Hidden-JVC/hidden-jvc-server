const bcrypt = require('bcrypt');
const router = require('express').Router();

const database = require('../database.js');
const { parsePagination, sqlLogger, createJWT } = require('../helpers');

// /users/register
router.post('/register', async (req, res, next) => {
    try {
        const { name, password } = req.body;
        if (typeof name !== 'string' || typeof password !== 'string') {
            return next(new Error('you must provide both a name and a password'));
        }

        const hash = await bcrypt.hash(password, 10);

        const values = {
            Name: name,
            Password: hash,
            Type: 'User'
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
            .select('*')
            .from('User')
            .where('Name', '=', name);

        if (!user) {
            return next(new Error('invalid name or password'));
        }

        const match = await bcrypt.compare(password, user.Password);

        if (!match) {
            return next(new Error('invalid name or password'));
        }

        const [session] = await database
            .select('*')
            .from('Session')
            .where('UserId', '=', user.Id);

        if (session) {
            await database('Session')
                .where('UserId', '=', user.Id)
                .del();
        }

        const [sessionId] = await database
            .insert({ UserId: user.Id }, 'Id')
            .into('Session');

        const jwt = await createJWT(user.Id, user.Name, sessionId);

        res.json({ jwt });
    } catch (err) {
        next(err);
    }
});

// /users
router.get('/', async (req, res, next) => {
    try {
        const { debug } = res.locals;
        const pagination = parsePagination(req.query, 'CreationDate', 1, 5, 'DESC');

        const conditions = function () {
            const { type } = req.query;
            if (typeof type === 'string') {
                this.where('Type', '=', type);
            }
        };

        const query = database
            .from('User')
            .where(conditions);

        const users = await query.clone()
            .select('*')
            .orderBy(pagination.sort, pagination.order)
            .limit(pagination.limit)
            .offset(pagination.offset)
            .on('query', sqlLogger(debug));

        const [{ count }] = await query.clone()
            .select(database.raw('count(*)::integer'))
            .on('query', sqlLogger(debug));

        res.json({ users, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
