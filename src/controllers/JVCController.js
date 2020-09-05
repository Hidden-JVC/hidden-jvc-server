const database = require('../database.js');
const ForumController = require('./ForumController.js');
const { getTopicInfo } = require('../helpers');

module.exports = class JVCController {
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
        if (typeof topicId !== 'number') {
            throw new Error('topicId doit être un entier');
        }

        const topics = await database
            .select('*')
            .from('JVCTopic')
            .where('Id', '=', topicId);

        return topics.length === 1;
    }

    static async createTopic(forumId, viewId, topicId) {
        const topicInfo = await getTopicInfo(forumId, viewId, topicId);

        if (topicInfo === null) {
            throw new Error('Ce topic n\'existe pas');
        }

        const topicData = {
            Id: topicId,
            Title: topicInfo.title,
            JVCForumId: forumId,
            CreationDate: topicInfo.date,
            FirstPostContent: topicInfo.content,
            FirstPostUsername: topicInfo.author
        };

        await database
            .insert(topicData)
            .into('JVCTopic');
    }

    static async createPost(data) {
        const postData = {
            Content: data.content,
            Page: data.page,
            JVCTopicId: data.topicId
        };

        if (data.userId) {
            postData.UserId = data.userId;
        } else if (data.username) {
            postData.Username = data.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ username');
        }

        if (!(await ForumController.exists(data.forumId))) {
            await ForumController.create(data.forumId);
        }

        if (!(await this.topicExists(data.topicId))) {
            await this.createTopic(data.forumId, data.viewId, data.topicId);
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('JVCPost');

        return { postId };
    }

    static async getTopic(data) {
        if (typeof data.startDate !== 'string') {
            throw new Error('startDate est requis');
        }

        if (!data.endDate) {
            data.endDate = null;
        }

        const result = await database
            .select('*')
            .from(database.raw('"JVCTopicPostsJson"(?, ?, ?)', [data.topicId, data.startDate, data.endDate]));

        const topic = result.length > 0 ? result[0].JVCTopicPostsJson : null;

        return topic;
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

    static async deletePost(ids, action, userId) {
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
            throw new Error('post not found');
        }

        if (post.UserId === null || post.UserId !== data.userId) {
            throw new Error('you can\'t update this post');
        }

        await database('JVCPost')
            .update({ Content: data.content, ModificationDate: new Date() })
            .where('Id', '=', data.postId);
    }
};
