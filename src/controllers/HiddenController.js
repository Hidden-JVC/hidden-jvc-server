const { differenceInSeconds } = require('date-fns');

const database = require('../database.js');

const ForumController = require('./ForumController.js');
const { parsePagination } = require('../helpers');

module.exports = class HiddenController {
    static async getTopics(data) {
        const pagination = parsePagination(data, 'TopicListJson', 1, 20, 'DESC');

        if (isNaN(data.forumId)) {
            throw new Error('forumId est requis');
        }

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
            Content: data.content,
            Op: true,
            Ip: data.ip
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

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('ban');
        }

        if (!(await this.checkPostCooldown(data.ip, data.userId))) {
            throw new Error('cooldown');
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
            HiddenTopicId: data.topicId,
            Ip: data.ip
        };

        if (data.userId) {
            postData.UserId = data.userId;
        } else if (typeof data.username === 'string' && data.username.length >= 3) {
            postData.Username = data.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ data.username');
        }

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('ban');
        }

        if (!(await this.checkPostCooldown(data.ip, data.userId))) {
            throw new Error('cooldown');
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
            throw new Error('ban');
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
            throw new Error('utilisateur non existant');
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
            throw new Error('not allowed');
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
                throw new Error('unknown action');
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

            case 'Delete':
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

    static async isIpBanned(ip) {
        const rows = await database
            .select('*')
            .from('BannedIp')
            .where('Ip', '=', ip);

        return rows.length > 0;
    }

    static async updatePostContent(data) {
        if (typeof data.postId !== 'number') {
            throw new Error('postId est requis');
        }

        if ((await this.isIpBanned(data.ip))) {
            throw new Error('ban');
        }

        if (!(await this.checkPostCooldown(data.ip, data.userId))) {
            throw new Error('cooldown');
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
        const lastPost = await this.getLastPostFromIp(ip);
        if (lastPost === null) {
            return true;
        }

        const seconds = differenceInSeconds(new Date(), new Date(lastPost.CreationDate));

        if (userId) {
            const postsCount = await this.getUserPostsCount(userId);
            if (postsCount > 200) {
                return true;
            } else if (postsCount > 100) {
                return seconds > 30;
            } else {
                return seconds > 60;
            }
        } else {
            return seconds > 60; // 1 minutes cooldown for unregistered account
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
