const bcrypt = require('bcrypt');

const database = require('../database.js');
const { createJWT } = require('../helpers');

module.exports = class HiddenController {
    static async getUser(data) {
        if (typeof data.userId !== 'number' || isNaN(data.userId)) {
            throw new Error('userId est requis');
        }

        const users = await database
            .select(['Id', 'Name', 'Email', 'ProfilePicture', 'Signature', 'Kicked', 'Banned', 'CreationDate'])
            .from('User')
            .where('Id', '=', data.userId);

        if (users.length === 0) {
            throw new Error('Utilisateur introuvable');
        }

        return users[0];
    }

    static async updateUser(data) {
        if (typeof data.userId !== 'number' || isNaN(data.userId)) {
            throw new Error('userId est requis');
        }

        if (typeof data.connectedUserId !== 'number' || isNaN(data.connectedUserId)) {
            throw new Error('connectedUserId est requis');
        }

        if (data.userId !== data.connectedUserId) {
            throw new Error('Vous n\'êtes pas autorisé à modifier ce compte');
        }

        const values = {};

        if (typeof data.email === 'string') {
            if (data.email === '') {
                data.email = null;
            }
            values.Email = data.email;
        }

        if (typeof data.signature === 'string') {
            if (data.signature === '') {
                data.signature = null;
            }
            values.Signature = data.signature;
        }

        if (typeof data.profilePicture === 'string') {
            if (data.profilePicture === '') {
                data.profilePicture = null;
            }
            values.ProfilePicture = data.profilePicture;
        }

        await database('User')
            .update(values)
            .where('Id', '=', data.userId);
    }

    static async register(data) {
        if (typeof data.name !== 'string' || typeof data.password !== 'string') {
            throw new Error('you must provide both a name and a password');
        }

        const [existingUser] = await database
            .select('*')
            .from('User')
            .where('Name', '=', data.name);

        if (existingUser) {
            throw new Error('Ce pseudo est déjà pris');
        }

        const hash = await bcrypt.hash(data.password, 10);

        const values = {
            Name: data.name,
            Password: hash
        };

        const [userId] = await database
            .insert(values, 'Id')
            .into('User');

        const [sessionId] = await database
            .insert({ UserId: userId }, 'Id')
            .into('Session');

        const jwt = await createJWT(userId, data.name, sessionId);

        return { jwt, userId, isAdmin: false, moderators: [] };
    }

    static async login(data) {
        if (typeof data.name !== 'string' || typeof data.password !== 'string') {
            throw new Error('you must provide both a name and a password');
        }

        const [user] = await database
            .select(['Id', 'Name', 'Password', 'IsAdmin'])
            .from('User')
            .where('Name', '=', data.name);

        if (!user) {
            throw new Error('invalid name or password');
        }

        const match = await bcrypt.compare(data.password, user.Password);

        if (!match) {
            throw new Error('invalid name or password');
        }

        await database('Session')
            .where('UserId', '=', user.Id)
            .del();

        const [sessionId] = await database
            .insert({ UserId: user.Id }, 'Id')
            .into('Session');

        const moderators = await database
            .select(['ForumId', database.raw('array_to_json("Actions") AS "Actions"')])
            .from('Moderator')
            .where('UserId', '=', user.Id);

        const jwt = await createJWT(user.Id, user.Name, sessionId);

        return { jwt, userId: user.Id, isAdmin: user.IsAdmin, moderators };
    }
};
