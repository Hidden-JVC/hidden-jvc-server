const bcrypt = require('bcrypt');

const database = require('../database.js');
const { createJWT } = require('../helpers');

module.exports = class HiddenController {
    static async getUsers(data) {
        const projection = database.raw(`
            json_build_object (
                'Id', "User"."Id",
                'Name', "User"."Name",
                'CreationDate', "User"."CreationDate",
                'Banned', "User"."Banned",
                'Email', "User"."Email",
                'ProfilePicture', "User"."ProfilePicture",
                'PostCount', "User"."PostCount",
                'Signature', "User"."Signature",

                'Badges', CASE WHEN MIN("Badge"."Id") IS NULL THEN '[]'::JSON ELSE
                    json_agg(
                        json_build_object(
                            'Id', "Badge"."Id",
                            'Name', "Badge"."Name",
                            'Description', "Badge"."Description",
                            'AssociationDate', "UserBadge"."AssociationDate"
                        )
                    )
                END
            ) as json
        `);

        const results = await database
            .select(projection)
            .from('User')
            .leftOuterJoin('UserBadge', 'UserBadge.UserId', '=', 'User.Id')
            .leftOuterJoin('Badge', 'Badge.Id', '=', 'UserBadge.BadgeId')
            .where(this.getUsersConditions(data))
            .groupBy('User.Id');

        const users = results.map((row) => row.json);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('User')
            .where(this.getUsersConditions(data));

        return { users, count };
    }

    static getUsersConditions(data) {
        return function (query) {
            if (data.name) {
                query.whereRaw('lower("User"."Name") like concat(\'%\', lower(?), \'%\')', [data.name]);
            }
        };
    }

    static async me(data) {
        if (isNaN(parseInt(data.userId))) {
            throw new Error('userId est requis');
        }

        let projection = database.raw(`
            json_build_object (
                'Id', "User"."Id",
                'Name', "User"."Name",
                'CreationDate', "User"."CreationDate",
                'Banned', "User"."Banned",
                'Email', "User"."Email",
                'ProfilePicture', "User"."ProfilePicture",
                'PostCount', "User"."PostCount",
                'Signature', "User"."Signature",

                'Badges', CASE WHEN MIN("Badge"."Id") IS NULL THEN '[]'::JSON ELSE
                    json_agg(
                        json_build_object(
                            'Id', "Badge"."Id",
                            'Name', "Badge"."Name",
                            'Description', "Badge"."Description",
                            'AssociationDate', "UserBadge"."AssociationDate"
                        )
                    )
                END
            ) as json
        `);

        const [{ json: user }] = await database
            .select(projection)
            .from('User')
            .leftOuterJoin('UserBadge', 'UserBadge.UserId', '=', 'User.Id')
            .leftOuterJoin('Badge', 'Badge.Id', '=', 'UserBadge.BadgeId')
            .where('User.Id', '=', data.userId)
            .groupBy('User.Id');

        if (!user) {
            throw new Error('l\'utilisateur n\'existe pas');
        }

        projection = database.raw(`
            json_build_object (
                'Id', "HiddenTopic"."Id",
                'Title', "HiddenTopic"."Title",
                'CreationDate', "HiddenTopic"."CreationDate",
                'LastPostCreationDate', "HiddenTopic"."LastPostCreationDate",
                'JVCForumId', "HiddenTopic"."JVCForumId",

                'User', json_build_object(
                    'Id', "TopicAuthor"."Id",
                    'Name', "TopicAuthor"."Name",
                    'IsAdmin', "TopicAuthor"."IsAdmin",
                    'ProfilePicture', "TopicAuthor"."ProfilePicture",
                    'CreationDate', "TopicAuthor"."CreationDate",
                    'Signature', "TopicAuthor"."Signature",
                    'PostCount', "TopicAuthor"."PostCount"
                ),

                'Posts', json_agg(
                    json_build_object (
                        'Id', "QuotingPost"."Id",
                        'Content', "QuotingPost"."Content",
                        'CreationDate', "QuotingPost"."CreationDate",
                        'ModificationDate', "QuotingPost"."ModificationDate",
        
                        'User', json_build_object(
                            'Id', "QuotingUser"."Id",
                            'Name', "QuotingUser"."Name",
                            'IsAdmin', "QuotingUser"."IsAdmin",
                            'ProfilePicture', "QuotingUser"."ProfilePicture",
                            'CreationDate', "QuotingUser"."CreationDate",
                            'Signature', "QuotingUser"."Signature",
                            'PostCount', "QuotingUser"."PostCount",
                            'IsModerator', "Moderator"."UserId" IS NOT NULL
                        ),

                        'QuotedPost', json_build_object(
                            'Id', "QuotedPost"."Id",
                            'Content', "QuotedPost"."Content",
                            'CreationDate', "QuotedPost"."CreationDate",
                            'ModificationDate', "QuotedPost"."ModificationDate",
                            'Op', "QuotedPost"."Op",
                            'Pinned', "QuotedPost"."Pinned",
                            'QuotedPostId', "QuotedPost"."QuotedPostId",
        
                            'User', json_build_object(
                                'Id', "QuotedUser"."Id",
                                'Name', "QuotedUser"."Name",
                                'IsAdmin', "QuotedUser"."IsAdmin",
                                'Banned', "QuotedUser"."Banned",
                                'ProfilePicture', "QuotedUser"."ProfilePicture",
                                'CreationDate', "QuotedUser"."CreationDate",
                                'Signature', "QuotedUser"."Signature",
                                'PostCount', "QuotedUser"."PostCount"
                            )
                        )
                    )
                )
            ) as json
        `);

        const rows = await database
            .select(projection)
            .from('QuoteNotification')
            .leftJoin('HiddenPost AS QuotingPost', function () {
                this.on('QuoteNotification.HiddenPostId', '=', 'QuotingPost.Id');
            })
            .leftJoin('User AS QuotingUser', function () {
                this.on('QuotingUser.Id', '=', 'QuotingPost.UserId');
            })
            .leftJoin('HiddenTopic', function () {
                this.on('HiddenTopic.Id', '=', 'QuotingPost.HiddenTopicId');
            })
            .leftJoin('User AS TopicAuthor', function () {
                this.on('TopicAuthor.Id', '=', 'HiddenTopic.UserId');
            })
            .leftJoin('HiddenPost AS QuotedPost', function () {
                this.on('QuotedPost.Id', '=', 'QuotingPost.QuotedPostId');
            })
            .leftJoin('User AS QuotedUser', function () {
                this.on('QuotedUser.Id', '=', 'QuotedPost.UserId');
            })
            .leftJoin('Moderator', function () {
                this.on('Moderator.UserId', '=', 'QuotingUser.Id');
                this.andOn('Moderator.ForumId', '=', 'HiddenTopic.JVCForumId');
            })
            .where('QuoteNotification.UserId', '=', data.userId)
            .groupBy('HiddenTopic.Id')
            .groupBy('TopicAuthor.Id');
        // .orderBy('HiddenPost.CreationDate', 'DESC');

        const notifications = rows.map((r) => r.json);

        return { user, notifications };
    }

    static async getUser(data) {
        if (typeof data.userName !== 'string') {
            throw new Error('userName est requis');
        }

        const projection = database.raw(`
            json_build_object (
                'Id', "User"."Id",
                'Name', "User"."Name",
                'CreationDate', "User"."CreationDate",
                'Banned', "User"."Banned",
                'Email', "User"."Email",
                'ProfilePicture', "User"."ProfilePicture",
                'PostCount', "User"."PostCount",
                'Signature', "User"."Signature",

                'Badges', CASE WHEN MIN("Badge"."Id") IS NULL THEN '[]'::JSON ELSE
                    json_agg(
                        json_build_object(
                            'Id', "Badge"."Id",
                            'Name', "Badge"."Name",
                            'Description', "Badge"."Description",
                            'AssociationDate', "UserBadge"."AssociationDate"
                        )
                    )
                END
            ) as json
        `);

        let request = undefined;
        const results = await database
            .select(projection)
            .from('User')
            .leftOuterJoin('UserBadge', 'UserBadge.UserId', '=', 'User.Id')
            .leftOuterJoin('Badge', 'Badge.Id', '=', 'UserBadge.BadgeId')
            .where('User.Name', '=', data.userName)
            .groupBy('User.Id')
            .on('query', function () {
                if (data.debug === '1') {
                    request = this.toString();
                }
            });

        if (results.length === 0) {
            throw new Error('Utilisateur introuvable');
        }

        const user = results[0].json;

        return { user, request };
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

            if (data.profilePicture !== null) {
                if (!data.profilePicture.startsWith('https://www.noelshack.com/') && !data.profilePicture.startsWith('https://image.noelshack.com/')) {
                    throw new Error('Vous devez saisir un lien noelshack valide');
                }
            }

            values.ProfilePicture = data.profilePicture;
        }

        await database('User')
            .update(values)
            .where('Id', '=', data.userId);
    }

    static async register(data) {
        if (typeof data.name !== 'string' || typeof data.password !== 'string') {
            throw new Error('Vous devez renseigner à la fois un pseudo et un mot de passe');
        }

        if (data.name.length < 3 || data.name.length > 15) {
            throw new Error('Le pseudo doit être compris entre 3 et 15 caractères');
        }

        if (data.password.length < 3) {
            throw new Error('Le mot de passe doit contenir au moins 3 caractères');
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
            throw new Error('Vous devez renseigner à la fois un pseudo et un mot de passe');
        }

        const [user] = await database
            .select(['Id', 'Name', 'Password', 'IsAdmin'])
            .from('User')
            .where('Name', '=', data.name);

        if (!user) {
            throw new Error('Pseudo ou mot de passe incorect');
        }

        const match = await bcrypt.compare(data.password, user.Password);

        if (!match) {
            throw new Error('Pseudo ou mot de passe incorect');
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

    static async hasRightToModerateUsers(userId, action) {
        const [moderator] = await database
            .select('*').from('Moderator')
            .where('UserId', '=', userId)
            .where(database.raw('? = ANY("Actions")', [action]));

        if (!moderator) {
            return false;
        }

        return true;
    }

    static async moderation(data) {
        const [user] = await database.select('*').from('User').where('Id', '=', data.connectedUserId);

        let allowed = user.IsAdmin;

        if (!allowed) {
            allowed = await this.hasRightToModerateUsers(data.connectedUserId, data.action);
        }

        if (!allowed) {
            throw new Error('Vous n\'avez pas les droits suffisant pour effectuer cette action');
        }

        switch (data.action) {
            case 'BanAccount':
                await this.updateBanAccount(data.connectedUserId, data.action, data.userId, true);
                break;
            case 'UnBanAccount':
                await this.updateBanAccount(data.connectedUserId, data.action, data.userId, false);
                break;
        }
    }

    static async updateBanAccount(connectedUserId, action, userId, banned) {
        const [user] = await database.select('*').from('User').where('Id', '=', userId);

        await database('User')
            .update({ Banned: banned })
            .where('Id', '=', userId);

        await database
            .insert({
                Action: action,
                UserId: connectedUserId,
                Label: `L'utilisateur ${user.Name} a été ${banned ? 'banni' : 'débanni'}`
            })
            .into('ModerationLog');
    }

    static async banIp() {

    }
};
