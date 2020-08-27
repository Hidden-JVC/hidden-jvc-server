const superagent = require('superagent');

const database = require('../database.js');

module.exports = class HiddenController {
    static async exists(forumId) {
        if (typeof forumId !== 'number') {
            throw new Error('forumId doit être un entier');
        }

        const forums = await database
            .select('*')
            .from('JVCForum')
            .where('Id', '=', forumId);

        return forums.length === 1;
    }

    static async create(forumId) {
        if (typeof forumId !== 'number') {
            throw new Error('forumId doit être un entier');
        }

        const forumName = await this.getForumName(forumId);

        await database
            .insert({ Id: forumId, Name: forumName }, 'Id')
            .into('JVCForum');
    }

    static async getForumName(forumId) {
        const forumUrl = `https://www.jeuxvideo.com/forums/0-${forumId}-0-1-0-1-0-0.htm`;
        const response = await superagent.get(forumUrl);
        if (response.redirects.length !== 1 || response.redirects[0] === 'https://www.jeuxvideo.com/forums.htm') {
            return null;
        }

        const html = response.text;
        const matches = html.match(/<title>(.*?)<\/title>/);
        if (matches === null) {
            throw new Error('aze');
        }

        const title = matches[1]
            .replace(/-\s* jeuxvideo.com/, '')
            .replace(/^Forum/, '')
            .trim();

        return title;
    }
};
