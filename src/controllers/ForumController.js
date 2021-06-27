const database = require('../database.js');

module.exports = class HiddenController {
    static async get(forumId) {
        if (isNaN(parseInt(forumId))) {
            throw new Error('forumId est requis');
        }

        const projection = database.raw(`
            json_build_object(
                'Id', "JVCForum"."Id",
                'Name', "JVCForum"."Name",

                'Moderators', CASE WHEN MIN("Moderator"."ForumId") IS NOT NULL THEN json_agg (
                    json_build_object (
                        'Id', "User"."Id",
                        'Name', "User"."Name"
                    )
                ) ELSE '[]'::json END,

                'Tags', (
                    SELECT json_agg(json_build_object('Id', "Id", 'Name', "Name", 'Color', "Color")) FROM "TopicTag"
                )
            ) as json
        `);

        const [{ json: forum }] = await database
            .select(projection)
            .from('JVCForum')
            .leftJoin('Moderator', 'Moderator.ForumId', '=', 'JVCForum.Id')
            .leftJoin('User', 'User.Id', '=', 'Moderator.UserId')
            .where('JVCForum.Id', '=', forumId)
            .groupBy('JVCForum.Id');

        if (!forum) {
            return null;
        }
        return forum;
    }

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
            .insert({ Id: forumId, Name: forumName })
            .into('JVCForum');
    }
};
