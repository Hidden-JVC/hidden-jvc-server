const { differenceInSeconds } = require('date-fns');

const database = require('../database.js');

const ForumController = require('./ForumController.js');
const { computePagination } = require('../helpers');

module.exports = class HiddenController {
    static async getTopics(data) {
        const forum = await ForumController.get(data.forumId);
        if (forum === null) {
            throw new Error('Ce forum n\'existe pas');
        }

        const { offset, limit } = computePagination(data.page, data.limit, 20);

        const projection = database.raw(`
            json_build_object(
                'Id', "HiddenTopic"."Id",
                'Title', "HiddenTopic"."Title",
                'CreationDate', "HiddenTopic"."CreationDate",
                'DeletionDate', "HiddenTopic"."DeletionDate",
                'Pinned', "HiddenTopic"."Pinned",
                'Locked', "HiddenTopic"."Locked",
                'UserId', "HiddenTopic"."UserId",
                'JVCForumId', "HiddenTopic"."JVCForumId",
                'LastPostCreationDate', "HiddenTopic"."LastPostCreationDate",
                'PostCount', "HiddenTopic"."PostCount",

                'User', json_build_object(
                    'Id', "TopicAuthor"."Id",
                    'Name', "TopicAuthor"."Name",
                    'IsAdmin', "TopicAuthor"."IsAdmin",
                    'IsModerator', "AuthorModerator"."UserId" IS NOT NULL
                ),

                'Tags', COALESCE((
                    SELECT json_agg(
                        json_build_object(
                        'Id', "Id",
                        'Name', "Name",
                        'Color', "Color",
                        'Locked', "Locked"
                        )
                    )
                    FROM "TopicTag"
                    JOIN "HiddenTopicTag"
                    ON "TopicTag"."Id" = "HiddenTopicTag"."TagId"
                    AND "HiddenTopicTag"."TopicId" = "HiddenTopic"."Id"
                ), '[]'::JSON)
            ) as json
        `);

        const result = await database
            .select(projection)
            .from('HiddenTopic')
            .leftJoin('User as TopicAuthor', function () {
                this.on('TopicAuthor.Id', '=', 'HiddenTopic.UserId');
            })
            .leftJoin('Moderator as AuthorModerator', function () {
                this.on('AuthorModerator.UserId', '=', 'HiddenTopic.UserId');
                this.andOn('AuthorModerator.ForumId', '=', 'HiddenTopic.JVCForumId');
            })
            .where(this.getTopicsConditions(data))
            .orderBy('HiddenTopic.Pinned', 'DESC')
            .orderBy('HiddenTopic.LastPostCreationDate', 'DESC')
            .offset(offset)
            .limit(limit);

        const topics = result.map((row) => row.json);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('HiddenTopic')
            .leftJoin('User as TopicAuthor', function () {
                this.on('TopicAuthor.Id', '=', 'HiddenTopic.UserId');
            })
            .where(this.getTopicsConditions(data));

        return { forum, topics, count };
    }

    static getTopicsConditions(data) {
        return function (query) {
            query.where('HiddenTopic.JVCForumId', '=', data.forumId);
            query.whereNull('HiddenTopic.DeletionDate');

            if (data.pinned === '1') {
                query.where('HiddenTopic.Pinned', '=', true);
            }
            if (data.pinned === '0') {
                query.where('HiddenTopic.Pinned', '=', false);
            }

            if (data.searchTitle) {
                query.whereRaw('lower("HiddenTopic"."Title") like concat(\'%\', lower(?), \'%\')', [data.searchTitle]);
            }

            if (data.searchUserId) {
                query.whereRaw('"TopicAuthor"."Id" = ?', [data.searchUserId]);
            }

            if (data.searchTagIds) {
                query.whereRaw(`
                "HiddenTopic"."Id" IN (
                    (SELECT "TopicId" FROM "HiddenTopicTag" GROUP BY "TopicId" HAVING array_agg("TagId") @>  string_to_array(?, ',')::INTEGER[])
                )
            `, [data.searchTagIds]);
            }

            if (data.startDate) {
                query.where('HiddenTopic.LastPostCreationDate', '>=', data.startDate);
            }

            if (data.endDate) {
                query.where('HiddenTopic.LastPostCreationDate', '<=', data.endDate);
            }
        };
    }

    static async getTopic(data) {
        const { offset, limit } = computePagination(data.page, data.limit, 20);

        const topicProjection = database.raw(`
            json_build_object(
                'Id', "HiddenTopic"."Id",
                'Title', "HiddenTopic"."Title",
                'CreationDate', "HiddenTopic"."CreationDate",
                'Pinned', "HiddenTopic"."Pinned",
                'Locked', "HiddenTopic"."Locked",
                'UserId', "HiddenTopic"."UserId",
                'JVCForumId', "HiddenTopic"."JVCForumId",
                'LastPostCreationDate', "HiddenTopic"."LastPostCreationDate",
                'PostCount', "HiddenTopic"."PostCount",

                'Author', json_build_object(
                    'Id', "TopicAuthor"."Id",
                    'Name', "TopicAuthor"."Name"
                ),
                'Tags', COALESCE((
                    SELECT json_agg(
                        json_build_object(
                            'Id', "Id",
                            'Name', "Name",
                            'Color', "Color",
                            'Locked', "Locked"
                        )
                    )
                    FROM "TopicTag"
                    JOIN "HiddenTopicTag"
                    ON "TopicTag"."Id" = "HiddenTopicTag"."TagId"
                    AND "HiddenTopicTag"."TopicId" = "HiddenTopic"."Id"
                ), '[]'::JSON)
            ) as json
        `);

        const [{ json: topic }] = await database
            .select(topicProjection)
            .from('HiddenTopic')
            .leftJoin('User as TopicAuthor', function () {
                this.on('TopicAuthor.Id', '=', 'HiddenTopic.UserId');
            })
            .where('HiddenTopic.Id', '=', data.topicId);

        const forum = await ForumController.get(topic.JVCForumId);
        if (forum === null) {
            throw new Error('Ce forum n\'existe pas');
        }

        const postsProjection = database.raw(`
            json_build_object(
                'Id', "HiddenPost"."Id",
                'Content', "HiddenPost"."Content",
                'CreationDate', "HiddenPost"."CreationDate",
                'ModificationDate', "HiddenPost"."ModificationDate",
                'Op', "HiddenPost"."Op",
                'Pinned', "HiddenPost"."Pinned",
                'IpBanned', "BannedIp"."Ip" IS NOT NULL,

                'User', json_build_object(
                    'Id', "User"."Id",
                    'Name', "User"."Name",
                    'IsAdmin', "User"."IsAdmin",
                    'Banned', "User"."Banned",
                    'ProfilePicture', "User"."ProfilePicture",
                    'CreationDate', "User"."CreationDate",
                    'Signature', "User"."Signature",
                    'PostCount', "User"."PostCount",
                    'IsModerator', "Moderator"."UserId" IS NOT NULL
                ),

                'QuotedPost', CASE WHEN "QuotedPost"."Id" IS NULL THEN NULL ELSE json_build_object(
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
                ) END
            ) as json
        `);

        let request = undefined;
        const result = await database
            .select(postsProjection)
            .from('HiddenPost')
            .leftJoin('User', function () {
                this.on('User.Id', '=', 'HiddenPost.UserId');
            })
            .leftJoin('HiddenPost AS QuotedPost', function () {
                this.on('HiddenPost.QuotedPostId', '=', 'QuotedPost.Id');
            })
            .leftJoin('User AS QuotedUser', function () {
                this.on('QuotedPost.UserId', '=', 'QuotedUser.Id');
            })
            .leftJoin('BannedIp', function () {
                this.on('BannedIp.Ip', '=', 'HiddenPost.Ip');
            })
            .leftJoin('Moderator', function () {
                this.on('Moderator.UserId', '=', 'User.Id');
                this.andOn('Moderator.ForumId', '=', forum.Id);
            })
            .where(this.getTopicConditions(data))
            .orderBy('HiddenPost.Op', 'DESC')
            .orderBy('HiddenPost.Pinned', 'DESC')
            .orderBy('HiddenPost.CreationDate', 'ASC')
            .offset(offset)
            .limit(limit)
            .on('query', function () {
                if (data.debug === '1') {
                    request = this.toString();
                }
            });

        const posts = result.map((row) => row.json);

        return { forum, topic, posts, request };
    }

    static getTopicConditions(data) {
        return function (query) {
            query.where('HiddenPost.HiddenTopicId', '=', data.topicId);

            if (!isNaN(data.userId) && data.userId !== '') {
                query.where('HiddenPost.UserId', '=', data.userId);
            }
        };
    }

    static async getPostQuotes(data) {
        if (isNaN(data.postId)) {
            throw new Error('postId est requis');
        }

        const returnValue = { posts: [] };

        const result = await database.raw(`
            WITH RECURSIVE "Citations" AS (
                SELECT * FROM "HiddenPost" WHERE "Id" = ?
                UNION ALL
                SELECT "QuotedPost".* FROM "HiddenPost" AS "QuotedPost"
                JOIN "Citations" ON "QuotedPost"."Id" = "Citations"."QuotedPostId"
            )

            SELECT json_build_object(
                'Id', "Citations"."Id",
                'Content', "Citations"."Content",
                'CreationDate', "Citations"."CreationDate",
                'ModificationDate', "Citations"."ModificationDate",
                'Op', "Citations"."Op",
                'Pinned', "Citations"."Pinned",

                'User', json_build_object(
                    'Id', "User"."Id",
                    'Name', "User"."Name",
                    'IsAdmin', "User"."IsAdmin",
                    'Banned', "User"."Banned",
                    'ProfilePicture', "User"."ProfilePicture",
                    'CreationDate', "User"."CreationDate",
                    'Signature', "User"."Signature",
                    'PostCount', "User"."PostCount"
                )
            ) as json
            FROM "Citations"
            JOIN "User"
                ON "User"."Id" = "Citations"."UserId"
            ORDER BY "Citations"."CreationDate" ASC;
        `, [data.postId]);

        returnValue.posts = result.rows.map((r) => r.json);

        return returnValue;
    }

    static async createTopic(data) {
        if (typeof data !== 'object') {
            throw new Error('data est requis');
        }

        if (!data.userId) {
            throw new Error('Vous devez être connecté');
        }

        if (typeof data.title !== 'string' || data.title.length === 0) {
            throw new Error('data.title est requis');
        }

        if (typeof data.content !== 'string' || data.content.length === 0) {
            throw new Error('data.content est requis');
        }

        if (!Array.isArray(data.tags)) {
            throw new Error('data.tags est requis');
        }

        if (typeof data.forumId !== 'number') {
            throw new Error('data.forumId est requis');
        }

        const topicData = {
            Title: data.title,
            JVCForumId: data.forumId,
            UserId: data.userId
        };

        const postData = {
            Content: data.content,
            Op: true,
            Ip: data.ip,
            UserId: data.userId
        };

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('Vous êtes ban ip');
        }

        if (!(await this.checkPostCooldown(data.ip, data.userId))) {
            throw new Error('Vous devez attendre avant de pouvoir créer un nouveau topic');
        }

        if (!(await ForumController.exists(data.forumId))) {
            if (typeof data.forumName !== 'string' || data.forumName.length === 0) {
                throw new Error('data.forumName est requis');
            }
            await ForumController.create(data.forumId, data.forumName);
        }

        const [topicId] = await database
            .insert(topicData, 'Id')
            .into('HiddenTopic');

        postData.HiddenTopicId = topicId;

        const [postId] = await database
            .insert(postData, 'Id')
            .into('HiddenPost');

        for (const tagId of data.tags) {
            await database
                .insert({ TopicId: topicId, TagId: tagId })
                .into('HiddenTopicTag');
        }

        return { topicId, postId };
    }

    static async updateTopic(data) {
        if (typeof data !== 'object') {
            throw new Error('data est requis');
        }

        if (typeof data.topicId !== 'number' || isNaN(data.topicId)) {
            throw new Error('topicId est requis');
        }

        if (typeof data.userId !== 'number' || isNaN(data.userId)) {
            throw new Error('userId est requis');
        }

        const [topic] = await database.select('*').from('HiddenTopic').where('Id', '=', data.topicId);
        if (!topic) {
            throw new Error('Ce topic n\'existe pas');
        }

        // update title
        if (typeof data.title === 'string') {
            if (data.userId !== topic.UserId) {
                throw new Error('Vous n\'êtes pas l\'auteur du topic');
            }

            const seconds = differenceInSeconds(new Date(), new Date(topic.CreationDate));
            if (seconds > 60) {
                throw new Error('Vous ne pouvez pas modifier le titre d\'un topic après une minute');
            }

            await database('HiddenTopic')
                .update({ Title: data.title })
                .where('Id', '=', data.topicId);
        }

        if (Array.isArray(data.tags)) {
            const [user] = await database
                .select('*')
                .from('User')
                .where('Id', '=', data.userId);

            if (!user) {
                throw new Error('Utilisateur introuvable');
            }

            let allowed = user.IsAdmin;
            let isAdminOrModerator = true;

            if (!allowed) {
                allowed = await this.hasUserRightOnHiddenTopics(data.userId, 'ModifyTag', [data.topicId]);
            }
            if (!allowed) {
                allowed = data.userId === topic.UserId;
                isAdminOrModerator = false;
            }

            if (!allowed) {
                throw new Error('Vous n\'avez pas l\'autorisation de modifier les tags de ce topic');
            }

            await database('HiddenTopicTag').del().where('TopicId', '=', data.topicId);
            for (const tag of data.tags) {
                if (typeof tag.id !== 'number' || isNaN(tag.id)) {
                    continue;
                }
                if (typeof tag.locked !== 'boolean') {
                    tag.locked = false;
                }

                await database
                    .insert({ TopicId: data.topicId, TagId: tag.id, Locked: isAdminOrModerator })
                    .into('HiddenTopicTag');
            }
        }
    }

    static async topicExists(topicId) {
        if (typeof topicId !== 'number') {
            throw new Error('topicId doit être un entier');
        }

        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .where('Id', '=', topicId);

        return topics.length === 1;
    }

    static async createPost(data) {
        if (typeof data.content !== 'string') {
            throw new Error('content est requis');
        }

        if (typeof data.userId !== 'number') {
            throw new Error('Vous devez être connecté');
        }

        const postData = {
            Content: data.content,
            HiddenTopicId: data.topicId,
            Ip: data.ip,
            UserId: data.userId
        };

        if (!isNaN(parseInt(data.postId))) {
            postData.QuotedPostId = data.postId;
        }

        if ((await this.isUserBanned(data.userId))) {
            throw new Error('Votre compte est ban');
        }

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('Vous êtes ban ip');
        }

        if (!(await this.checkPostCooldown(data.ip, data.userId))) {
            throw new Error('Vous devez attendre avant de pouvoir poster à nouveau');
        }

        if ((await this.isTopicLock(data.topicId))) {
            throw new Error('Le topic est lock');
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('HiddenPost');

        if (!isNaN(parseInt(data.postId))) {
            const [quotedPost] = await database.select('*').from('HiddenPost').where('Id', '=', data.postId);
            if (!quotedPost) {
                throw new Error('Le post que vous voulez citer n\'existe pas');
            }

            if (quotedPost.UserId !== data.userId) {
                await database
                    .insert({ HiddenPostId: postId, UserId: quotedPost.UserId })
                    .into('QuoteNotification');
            }
        }

        return postId;
    }

    static async hasUserRightOnHiddenTopics(userId, action, topicIds) {
        for (const topicId of topicIds) {
            const [topic] = await database.select('*').from('HiddenTopic').where('Id', '=', topicId);

            if (!topic) {
                return false;
            }

            const [moderator] = await database
                .select('*').from('Moderator')
                .where('UserId', '=', userId)
                .where('ForumId', '=', topic.JVCForumId)
                .where(database.raw('? = ANY("Actions")', [action]));

            if (!moderator) {
                return false;
            }
        }

        return true;
    }

    static async updatePostPinned(data) {
        if (typeof data.postId !== 'number') {
            throw new Error('data.postId doit être un nombre');
        }

        if (typeof data.pinned !== 'boolean') {
            throw new Error('data.pinned doit être un boolean');
        }

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('Vous êtes ban ip');
        }

        const [post] = await database
            .select('*')
            .from('HiddenPost')
            .where('Id', '=', data.postId);

        if (!post) {
            throw new Error('Le post n\'existe pas');
        }

        const [topic] = await database
            .select('*')
            .from('HiddenTopic')
            .where('Id', '=', post.HiddenTopicId);

        if (!topic) {
            throw new Error('Le topic n\'existe pas');
        }

        if (data.userId !== topic.UserId) {
            throw new Error('Vous n\'êtes pas l\'auteur du topic');
        }

        await database('HiddenPost')
            .update({ Pinned: data.pinned })
            .where('Id', '=', data.postId);
    }

    static async postModeration(action, ids, userId) {
        if (typeof action !== 'string') {
            throw new Error('action  doit être un string');
        }

        if (!Array.isArray(ids)) {
            throw new Error('ids doit être un tableau');
        }

        if (typeof userId !== 'number') {
            throw new Error('ids doit être un entier');
        }

        const [user] = await database
            .select('*')
            .from('User')
            .where('Id', '=', userId);

        if (!user) {
            throw new Error('Utilisateur non existant');
        }

        let allowed = user.IsAdmin;

        let posts = null;
        if (!allowed) {
            posts = await database
                .select('*')
                .from('HiddenPost')
                .whereIn('Id', ids);

            const topicIds = posts.map((post) => post.HiddenTopicId);

            allowed = await this.hasUserRightOnHiddenTopics(userId, action, topicIds);
        }

        // regular users can delete their own posts
        if (!allowed && action === 'Delete') {
            allowed = posts.every((post) => post.UserId !== null && post.UserId === userId);
        }

        if (!allowed) {
            throw new Error('Vous n\'avez pas les droits suffisant pour effectuer cette action');
        }

        switch (action) {
            case 'Delete':
                await this.deletePost(ids, action, userId);
                break;
            case 'BanAccount':
                await this.banAccountFromPost(ids, action, userId, true);
                break;
            case 'UnBanAccount':
                await this.banAccountFromPost(ids, action, userId, false);
                break;
            case 'BanIp':
                await this.banIp(ids, action, userId);
                break;
            case 'UnBanIp':
                await this.unBanIp(ids, action, userId);
                break;
            default:
                throw new Error('Action inconnue');
        }
    }

    static async banIp(postIds, action, userId) {
        const posts = await database
            .select('*')
            .from('HiddenPost')
            .whereIn('Id', postIds);

        for (const post of posts) {
            if (post.Ip === null) {
                continue;
            }

            const [banIp] = await database
                .select('*')
                .from('BannedIp')
                .where('Ip', '=', post.Ip);

            if (banIp) {
                continue;
            }

            await database
                .insert({ Ip: post.Ip })
                .into('BannedIp');

            let label;
            if (post.UserId === null) {
                label = 'Un utilisateur anonyme a été ban ip';
            } else {
                const [user] = await database.select('*').from('User').where('Id', '=', post.UserId);
                label = `L'utilisateur ${user.Name} a été ban ip`;
            }

            await database
                .insert({
                    Action: action,
                    UserId: userId,
                    Label: label
                })
                .into('ModerationLog');
        }
    }

    static async unBanIp(postIds) {
        const posts = await database
            .select('*')
            .from('HiddenPost')
            .whereIn('Id', postIds);

        const ips = posts.filter((post) => post.Ip !== null)
            .map((post) => post.Ip);

        await database('BannedIp')
            .del()
            .whereIn('Ip', ips);
    }

    static async banAccountFromPost(ids, action, userId, banned) {
        const posts = await database
            .select('*')
            .from('HiddenPost')
            .whereIn('Id', ids);

        const userIds = posts
            .filter((post) => post.UserId !== null)
            .map((post) => post.UserId);

        await database('User')
            .update({ Banned: banned })
            .whereIn('Id', userIds);

        const users = await database
            .select('*')
            .from('User')
            .whereIn('Id', userIds);

        const data = users.map((user) => ({
            Action: action,
            UserId: userId,
            Label: `L'utilisateur ${user.Name} a été ${banned ? 'banni' : 'débanni'}`
        }));

        await database
            .insert(data)
            .into('ModerationLog');
    }

    static async topicModeration(action, ids, userId) {
        if (!Array.isArray(ids)) {
            throw new Error('ids doit être un tableau');
        }

        const [user] = await database
            .select('*')
            .from('User')
            .where('Id', '=', userId);

        let allowed = user.IsAdmin;

        if (!allowed) {
            allowed = await this.hasUserRightOnHiddenTopics(userId, action, ids);
        }

        if (!allowed) {
            throw new Error('Vous n\'avez pas les droits suffisant pour effectuer cette action');
        }

        switch (action) {
            case 'Pin':
                await this.pin(ids, action, userId);
                break;

            case 'UnPin':
                await this.unpin(ids, action, userId);
                break;

            case 'Lock':
                await this.lock(ids, action, userId);
                break;

            case 'UnLock':
                await this.unlock(ids, action, userId);
                break;

            case 'Delete':
                await this.deleteTopic(ids, action, userId);
                break;

            default:
                throw new Error('Action inconnue');
        }
    }

    static async pin(ids, action, userId) {
        await database('HiddenTopic')
            .update({ Pinned: true })
            .whereIn('Id', ids);

        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .whereIn('Id', ids);

        const data = [];
        for (const topic of topics) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le topic "${topic.Title}" (#${topic.Id}) a été épinglé`
            });
        }

        await database
            .insert(data)
            .into('ModerationLog');
    }

    static async unpin(ids, action, userId) {
        await database('HiddenTopic')
            .update({ Pinned: false })
            .whereIn('Id', ids);

        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .whereIn('Id', ids);

        const data = [];
        for (const topic of topics) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le topic "${topic.Title}" (#${topic.Id}) a été désépinglé`
            });
        }
        await database
            .insert(data)
            .into('ModerationLog');
    }

    static async lock(ids, action, userId) {
        await database('HiddenTopic')
            .update({ Locked: true })
            .whereIn('Id', ids);

        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .whereIn('Id', ids);

        const data = [];
        for (const topic of topics) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le topic "${topic.Title}" (#${topic.Id}) a été lock`
            });
        }
        await database
            .insert(data)
            .into('ModerationLog');
    }

    static async unlock(ids, action, userId) {
        await database('HiddenTopic')
            .update({ Locked: false })
            .whereIn('Id', ids);

        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .whereIn('Id', ids);

        const data = [];
        for (const topic of topics) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le topic "${topic.Title}" (#${topic.Id}) a été délock`
            });
        }
        await database
            .insert(data)
            .into('ModerationLog');
    }

    static async deleteTopic(ids, action, userId) {
        const topics = await database
            .select('*')
            .from('HiddenTopic')
            .whereIn('Id', ids);

        const data = [];
        for (const topic of topics) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le topic "${topic.Title}" (#${topic.Id}) a été supprimé`
            });
        }
        await database
            .insert(data)
            .into('ModerationLog');

        await database('HiddenTopic')
            .del()
            .whereIn('Id', ids);
    }

    static async deletePost(ids, action, userId) {
        const posts = await database
            .select('*')
            .from('HiddenPost')
            .whereIn('Id', ids);

        const data = [];
        for (const post of posts) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le post hidden (#${post.Id}) a été supprimé`
            });
        }
        await database
            .insert(data)
            .into('ModerationLog');

        await database('HiddenPost')
            .del()
            .whereIn('Id', ids);
    }

    static async isIpBanned(ip) {
        const rows = await database
            .select('*')
            .from('BannedIp')
            .where('Ip', '=', ip);

        return rows.length > 0;
    }

    static async isUserBanned(userId) {
        const [user] = await database
            .select('*')
            .from('User')
            .where('Id', '=', userId);

        if (!user) {
            throw new Error('l\'utilisateur n\'existe pas');
        }

        return user.Banned;
    }

    static async isTopicLock(topicId) {
        const [topic] = await database
            .select('*')
            .from('HiddenTopic')
            .where('Id', '=', topicId);

        if (!topic) {
            throw new Error('Le topic est introuvable');
        }

        return topic.Locked;
    }

    static async updatePostContent(data) {
        if (typeof data.postId !== 'number') {
            throw new Error('postId est requis');
        }

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('Vous êtes ban ip');
        }

        // if (!(await this.checkPostCooldown(data.ip, data.userId))) {
        //     throw new Error('Vous devez attendre avant de pouvoir modifier votre message');
        // }

        const [post] = await database
            .select('*')
            .from('HiddenPost')
            .where('Id', '=', data.postId);

        if (!post) {
            throw new Error('Message introuvable');
        }

        if (post.UserId === null || post.UserId !== data.userId) {
            throw new Error('Vous n\'êtes pas l\'auteur de ce message');
        }

        await database('HiddenPost')
            .update({ Content: data.content, ModificationDate: new Date() })
            .where('Id', '=', data.postId);
    }

    static async getLastPostFromIp(ip) {
        // get modification date ?
        const posts = await database
            .select('*')
            .from('HiddenPost')
            .where('Ip', '=', ip)
            .orderBy('CreationDate', 'DESC')
            .limit(1);

        return posts.length > 0 ? posts[0] : null;
    }

    static async checkPostCooldown(ip, userId) {
        return true;
        const lastPost = await this.getLastPostFromIp(ip);
        if (lastPost === null) {
            return true;
        }

        const seconds = differenceInSeconds(new Date(), new Date(lastPost.CreationDate));

        const postsCount = await this.getUserPostsCount(userId);
        if (postsCount > 200) {
            return seconds > 5;
        } else if (postsCount > 100) {
            return seconds > 30;
        } else {
            return seconds > 60;
        }
    }

    static async getUserPostsCount(userId) {
        // TODO: add with union JVCPost
        const [{ count }] = await database
            .count('* as count')
            .from('HiddenPost')
            .where('UserId', '=', userId);

        return parseInt(count);
    }
};
