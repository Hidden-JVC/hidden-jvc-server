const database = require('../database.js');

const ForumController = require('./ForumController.js');
const { parsePagination } = require('../helpers');

module.exports = class HiddenController {
    static async getTopics(data) {
        const pagination = parsePagination(data, 'TopicListJson', 1, 20, 'DESC');

        if (!data.startDate) {
            data.startDate = null;
        }
        if (!data.endDate) {
            data.endDate = null;
        }

        let pinned = null;
        if (data.pinned === '1') {
            pinned = true;
        } else if (data.pinned === '0') {
            pinned = false;
        }

        const result = await database
            .select('*')
            .from(database.raw('"HiddenTopicListJson"(?, ?, ?, ?, ?, ?)', [data.forumId, pinned, pagination.offset, 20, data.startDate, data.endDate]));

        const topics = result.map((row) => row.HiddenTopicListJson);

        const [{ count }] = await database
            .select(database.raw('count(*)::integer'))
            .from('HiddenTopic')
            .where('JVCForumId', '=', data.forumId);

        return { topics, count };
    }

    static async getTopic(data) {
        if (!data.userId) {
            data.userId = null;
        }

        const pagination = parsePagination(data, 'Json', 1, 20, 'ASC');

        const [{ HiddenTopicPostsJson: topic }] = await database
            .select('*')
            .from(database.raw('"HiddenTopicPostsJson"(?, ?, ?, ?)', [data.topicId, pagination.offset, 20, data.userId]));

        return { topic };
    }

    static async createTopic(data) {
        if (typeof data !== 'object') {
            throw new Error('data est requis');
        }

        if (typeof data.title !== 'string' || data.title.length === 0) {
            throw new Error('data.title est requis');
        }

        if (typeof data.content !== 'string' || data.content.length === 0) {
            throw new Error('data.content est requis');
        }

        if (typeof data.forumId !== 'number') {
            throw new Error('data.forumId est requis');
        }

        const topicData = {
            Title: data.title,
            JVCForumId: data.forumId
        };

        const postData = {
            Content: data.content
        };

        if (data.userId) {
            topicData.UserId = data.userId;
            postData.UserId = data.userId;
        } else if (typeof data.username === 'string' && data.username.length >= 3) {
            topicData.Username = data.username;
            postData.Username = data.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ post.username');
        }

        if (!(await ForumController.exists(data.forumId))) {
            await ForumController.create(data.forumId);
        }

        const [topicId] = await database
            .insert(topicData, 'Id')
            .into('HiddenTopic');

        postData.HiddenTopicId = topicId;

        const [postId] = await database
            .insert(postData, 'Id')
            .into('HiddenPost');

        return { topicId, postId };
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
            throw new Error('data.content est requis');
        }

        const postData = {
            Content: data.content,
            HiddenTopicId: data.topicId
        };

        if (data.userId) {
            postData.UserId = data.userId;
        } else if (typeof data.username === 'string' && data.username.length >= 3) {
            postData.Username = data.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ data.username');
        }

        const [topic] = await database
            .select('*')
            .from('HiddenTopic')
            .where('Id', '=', data.topicId);

        if (!topic) {
            throw new Error(`Le topic avec l'id: ${data.topicId} est introuvable`);
        }

        if (topic.Locked) {
            throw new Error('Le topic est lock');
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('HiddenPost');

        return postId;
    }

    static async hasUserRightOnHiddenTopics(userId, action, topicIds) {
        const [{ HasUserRightOnHiddenTopics }] = await database
            .select('*')
            .from(database.raw('"HasUserRightOnHiddenTopics"(?, ?, ?)', [userId, action, topicIds.join(',')]));
        return HasUserRightOnHiddenTopics;
    }

    static async postModeration(action, ids, userId) {
        switch (action) {
            case 'DeletePost':
                await this.deletePost(ids, action, userId);
                break;
            default:
                throw new Error('unknown action');
        }
    }

    static async topicModeration(action, ids, userId) {
        if (!Array.isArray(ids)) {
            throw new Error('ids must be an array');
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
            throw new Error('not allowed');
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

            case 'DeleteTopic':
                await this.deleteTopic(ids, action, userId);
                break;

            default:
                throw new Error('unknown action');
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

    static async updatePost(data) {
        if (typeof data.postId !== 'number') {
            throw new Error('postId est requis');
        }

        const [post] = await database
            .select('*')
            .from('HiddenPost')
            .where('Id', '=', data.postId);

        if (!post) {
            throw new Error('post not found');
        }

        if (post.UserId === null || post.UserId !== data.userId) {
            throw new Error('you can\'t update this post');
        }

        await database('HiddenPost')
            .update({ Content: data.content, ModificationDate: new Date() })
            .where('Id', '=', data.postId);
    }
};
