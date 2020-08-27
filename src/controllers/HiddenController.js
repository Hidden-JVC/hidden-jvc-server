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

        const result = await database
            .select('*')
            .from(database.raw('"HiddenTopicListJson"(?, ?, ?, ?, ?)', [data.forumId, pagination.offset, 20, data.startDate, data.endDate]));

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
        if (typeof data !== 'object') {
            throw new Error('data est requis');
        }

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
};
