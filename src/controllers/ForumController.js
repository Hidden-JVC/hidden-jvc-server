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

    static async create(forumId, forumName) {
        if (typeof forumId !== 'number') {
            throw new Error('forumId doit être un entier');
        }

        await database
            .insert({ Id: forumId, Name: forumName }, 'Id')
            .into('JVCForum');
    }
};
