const database = require('../database.js');
const ForumController = require('./ForumController.js');

module.exports = class JVCController {
    static async getForum(data) {
        if (typeof data.forumId !== 'number') {
            throw new Error('forumId est doit être un nombre');
        }

        const forums = await database
            .select('*')
            .from(database.raw('"JVCForumJson"(?)', data.forumId));

        if (forums.length === 0) {
            throw new Error('Ce forum n\'existe pas');
        }

        return forums[0].JVCForumJson;
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
        if (typeof topicId !== 'number') {
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

    static async convertTopicToHidden(data) {
        if (typeof data.jvcTopicId !== 'number') {
            throw new Error('jvcTopicId est requis');
        }

        const [jvcTopic] = await database
            .select('*')
            .from('JVCTopic')
            .where('Id', '=', data.jvcTopicId);

        if (!jvcTopic) {
            throw new Error('topic introuvable');
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
