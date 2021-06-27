const database = require('../database.js');
const ForumController = require('./ForumController.js');

module.exports = class JVCController {
    static async getForum(data) {
        const returnValue = { forum: null, jvcTopics: [], pinnedHiddenTopics: [], inBetweenHiddenTopics: [], lastHiddenTopics: [], queries: [] };

        if (isNaN(parseInt(data.forumId))) {
            throw new Error('forumId est requis');
        }

        const forum = await ForumController.get(data.forumId);

        if (forum === null) {
            return returnValue;
        }
        returnValue.forum = forum;

        if (typeof data.topicIds === 'string') {
            const ids = data.topicIds.split(',').filter((id) => id !== '');
            if (ids.length > 0) {
                const projection = database.raw(`
                    json_build_object(
                        'Id', "JVCTopic"."Id",
                        'Title', "JVCTopic"."Title",
                        'CreationDate', "JVCTopic"."CreationDate",
                        'PostCount', "JVCTopic"."PostCount",
                        'LastPostCreationDate', "JVCTopic"."LastPostCreationDate",
                        'PostCount', "JVCTopic"."PostCount",
                        'JVCForumId', "JVCTopic"."JVCForumId"
                    ) as json
                `);

                const results = await database
                    .select(projection)
                    .from('JVCTopic')
                    .whereIn('Id', ids)
                    .on('query', function () { data.debug === '1' && returnValue.queries.push(this.toString()); });

                returnValue.jvcTopics = results.map((row) => row.json);
            }
        }

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
        const query = database
            .select(topicProjection)
            .from('HiddenTopic')
            .leftJoin('User as TopicAuthor', function () {
                this.on('TopicAuthor.Id', '=', 'HiddenTopic.UserId');
            })
            .leftJoin('Moderator as AuthorModerator', function () {
                this.on('AuthorModerator.UserId', '=', 'HiddenTopic.UserId');
                this.andOn('AuthorModerator.ForumId', '=', 'HiddenTopic.JVCForumId');
            });

        let results = await query.clone()
            .where(function (query) {
                query.where('HiddenTopic.Pinned', '=', true);
            })
            .orderBy('HiddenTopic.LastPostCreationDate', 'DESC')
            .on('query', function () { data.debug === '1' && returnValue.queries.push(this.toString()); });

        returnValue.pinnedHiddenTopics = results.map((row) => row.json);

        results = await query.clone()
            .where(function (query) {
                query.where('HiddenTopic.Pinned', '=', false);
                if (data.startDate) {
                    query.where('HiddenTopic.LastPostCreationDate', '<=', data.startDate);
                }
    
                if (data.endDate) {
                    query.where('HiddenTopic.LastPostCreationDate', '>=', data.endDate);
                }
            })
            .orderBy('HiddenTopic.LastPostCreationDate', 'DESC')
            .on('query', function () { data.debug === '1' && returnValue.queries.push(this.toString()); });

        returnValue.inBetweenHiddenTopics = results.map((row) => row.json);

        results = await query.clone()
            .where(function (query) {
                query.where('HiddenTopic.Pinned', '=', false);
                query.whereNotIn('HiddenTopic.Id', returnValue.inBetweenHiddenTopics.map((t) => t.Id));
            })
            .orderBy('HiddenTopic.LastPostCreationDate', 'DESC')
            .limit(5)
            .on('query', function () { data.debug === '1' && returnValue.queries.push(this.toString()); });

        returnValue.lastHiddenTopics = results.map((row) => row.json);

        return returnValue;
    }

    static async getTopics(data) {
        if (typeof data.topicIds !== 'string') {
            throw new Error('topicIds est requis');
        }

        const rows = await database
            .select('*')
            .from(database.raw('"JVCTopicListJson"(?)', data.topicIds));

        const topics = rows.map((row) => row.JVCTopicListJson);
        return topics;
    }

    static async topicExists(topicId) {
        if (isNaN(parseInt(topicId))) {
            throw new Error('topicId doit être un entier');
        }

        const topics = await database
            .select('*')
            .from('JVCTopic')
            .where('Id', '=', topicId);

        return topics.length === 1;
    }

    static async createTopic(data) {
        const topicData = {
            Id: data.topicId,
            Title: data.topicTitle,
            JVCForumId: data.forumId,
            CreationDate: data.topicDate,
            FirstPostContent: data.topicContent,
            FirstPostUsername: data.topicAuthor
        };

        await database
            .insert(topicData)
            .into('JVCTopic');
    }

    static async createPost(data) {
        if (!data) {
            throw new Error('data est requis');
        }

        if (typeof data.content !== 'string' || data.content.length === 0) {
            throw new Error('content est requis');
        }

        if (!data.userId) {
            throw new Error('Vous devez être connecté');
        }

        const postData = {
            Content: data.content,
            Page: data.page,
            JVCTopicId: data.topicId,
            UserId: data.userId
        };

        if (!(await ForumController.exists(data.forumId))) {
            await ForumController.create(data.forumId, data.forumName);
        }

        if (!(await this.topicExists(data.topicId))) {
            await this.createTopic(data);
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('JVCPost');

        return { postId };
    }

    static async getTopic(data) {
        const queries = [];

        const topicProjection = database.raw(`
            json_build_object(
                'Id', "JVCTopic"."Id",
                'Title', "JVCTopic"."Title",
                'JVCForumId', "JVCTopic"."JVCForumId",
                'CreationDate', "JVCTopic"."CreationDate",
                'LastPostCreationDate', "JVCTopic"."LastPostCreationDate",
                'PostCount', "JVCTopic"."PostCount"
            ) as json
        `);

        let results = await database
            .select(topicProjection)
            .from('JVCTopic')
            .where('JVCTopic.Id', '=', data.topicId)
            .on('query', function () { data.debug === '1' && queries.push(this.toString()); });

        if (results.length === 0) {
            return { topic: null };
        }

        const topic = results[0].json;

        const forum = await ForumController.get(topic.JVCForumId);
        if (forum === null) {
            throw new Error('Ce forum n\'existe pas');
        }

        const postsProjection = database.raw(`
            json_build_object(
                'Id', "JVCPost"."Id",
                'Content', "JVCPost"."Content",
                'CreationDate', "JVCPost"."CreationDate",
                'ModificationDate', "JVCPost"."ModificationDate",
                'Page', "JVCPost"."Page",
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
                )
            ) as json
        `);

        results = await database
            .select(postsProjection)
            .from('JVCPost')
            .leftJoin('User', function () {
                this.on('User.Id', '=', 'JVCPost.UserId');
            })
            .leftJoin('BannedIp', function () {
                this.on('BannedIp.Ip', '=', 'JVCPost.Ip');
            })
            .leftJoin('Moderator', function () {
                this.on('Moderator.UserId', '=', 'User.Id');
                this.andOn('Moderator.ForumId', '=', forum.Id);
            })
            .where(this.getTopicConditions(data))
            .orderBy('JVCPost.CreationDate', 'ASC')
            .on('query', function () { data.debug === '1' && queries.push(this.toString()); });

        const posts = results.map((row) => row.json);

        results = await database
            .select(database.raw('DISTINCT "Page"'))
            .from('JVCPost')
            .where('JVCTopicId', '=', data.topicId)
            .on('query', function () { data.debug === '1' && queries.push(this.toString()); });

        const pages = results.map((r) => r.Page);

        return { forum, topic, posts, pages, queries };
    }

    static getTopicConditions(data) {
        return function (query) {
            query.where('JVCPost.JVCTopicId', '=', data.topicId);
            query.where('JVCPost.CreationDate', '>', data.startDate);

            if (data.endDate) {
                query.where('JVCPost.CreationDate', '<', data.endDate);
            }
        };
    }

    static async hasUserRightOnJVCTopics(userId, action, topicIds) {
        for (const topicId of topicIds) {
            const [topic] = await database.select('*').from('HiddenJVC').where('Id', '=', topicId);

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

    static async postModeration(action, ids, userId) {
        if (!Array.isArray(ids)) {
            throw new Error('ids doit être un tableau');
        }

        const [user] = await database
            .select('*')
            .from('User')
            .where('Id', '=', userId);

        let allowed = user.IsAdmin;

        let posts = null;
        if (!allowed) {
            posts = await database
                .select('*')
                .from('HiddenPost')
                .whereIn('Id', ids);

            const topicIds = posts.map((post) => post.HiddenTopicId);

            allowed = await this.hasUserRightOnJVCTopics(userId, action, topicIds);
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
                await this.deletePost2(ids, action, userId);
                break;
            default:
                throw new Error('Action inconnue');
        }
    }

    static async deletePost(data) {
        if (!data) {
            throw new Error('data est requis');
        }

        if (!data.userId) {
            throw new Error('Vous devez être connecté');
        }

        if (!data.postId) {
            throw new Error('Vous devez spécifier un post');
        }

        const [user] = await database.select('*').from('User').where('Id', '=', data.userId);
        if (!user) {
            throw new Error('Utilisateur introuvable');
        }

        const [post] = await database.select('*').from('JVCPost').where('Id', '=', data.postId);
        if (!post) {
            throw new Error('Post introuvable');
        }

        if (user.Id !== post.UserId) {
            throw new Error('Vous ne pouvez pas supprimer ce post');
        }

        await database('JVCPost')
            .del()
            .where('Id', '=', data.postId);
    }

    static async deletePost2(ids, action, userId) {
        const posts = await database
            .select('*')
            .from('JVCPost')
            .whereIn('Id', ids);

        const data = [];
        for (const post of posts) {
            data.push({
                Action: action,
                UserId: userId,
                Label: `Le post jvc (#${post.Id}) a été supprimé`
            });
        }

        await database
            .insert(data)
            .into('ModerationLog');

        await database('JVCPost')
            .del()
            .whereIn('Id', ids);
    }

    static async updatePost(data) {
        if (typeof data.postId !== 'number') {
            throw new Error('postId est requis');
        }

        const [post] = await database
            .select('*')
            .from('JVCPost')
            .where('Id', '=', data.postId);

        if (!post) {
            throw new Error('Ce message est introuvable');
        }

        if (post.UserId === null || post.UserId !== data.userId) {
            throw new Error('Vous n\'êtes pas l\'auteur de ce topic');
        }

        await database('JVCPost')
            .update({ Content: data.content, ModificationDate: new Date() })
            .where('Id', '=', data.postId);
    }

    static async convertTopicToHidden(data) {
        if (typeof data.jvcTopicId !== 'number') {
            throw new Error('jvcTopicId est requis');
        }

        const [jvcTopic] = await database
            .select('*')
            .from('JVCTopic')
            .where('Id', '=', data.jvcTopicId);

        if (!jvcTopic) {
            throw new Error('Topic introuvable');
        }

        const jvcPosts = await database
            .select('*')
            .from('JVCPost')
            .where('JVCTopicId', '=', data.jvcTopicId);

        const topicData = {
            Title: jvcTopic.Title,
            CreationDate: jvcTopic.CreationDate,
            JVCTopicId: jvcTopic.JVCTopicId,
            JVCBackup: jvcTopic.JVCBackup,
            Username: jvcTopic.FirstPostUsername
        };

        const [hiddenTopicId] = await database
            .insert(topicData, 'Id')
            .into('HiddenTopic');

        const firstPostData = {
            Content: jvcTopic.FirstPostUsername,
            Op: true,
            CreationDate: jvcTopic.CreationDate,
            Username: jvcTopic.FirstPostUsername,
            HiddenTopicId: hiddenTopicId
        };

        const postsData = [firstPostData];

        for (const jvcPost of jvcPosts) {
            postsData.push({
                Content: jvcPost.Content,
                CreationDate: jvcPost.CreationDate,
                ModificationDate: jvcPost.ModificationDate,
                Username: jvcTopic.Username,
                HiddenTopicId: hiddenTopicId
            });
        }

        await database
            .insert(postsData)
            .into('HiddenPost');
    }
};
