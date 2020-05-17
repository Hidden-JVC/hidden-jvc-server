const router = require('express').Router();

const database = require('../../database.js');

// /jvc/topics
router.get('/', async (req, res, next) => {
    try {
        const { topicIds } = req.query;

        if (typeof topicIds !== 'string') {
            throw new Error('topicIds est requis');
        }

        const rows = await database
            .select('*')
            .from(database.raw('"JVCTopicListJson"(?)', topicIds));

        const topics = rows.map((row) => row.JVCTopicListJson);

        res.json({ topics });
    } catch (err) {
        next(err);
    }
});

// Creation of an hidden jvc post on a real jvc topic
// /jvc/topics/:topicId
router.post('/:topicId', async (req, res, next) => {
    try {
        const { userId } = res.locals;
        const { topicId } = req.params;

        const { forum, topic, post } = req.body;

        if (typeof post !== 'object') {
            throw new Error('post est requis');
        }

        if (typeof post.content !== 'string' || post.content.length === 0) {
            throw new Error('post.content est requis');
        }

        if (typeof post.page !== 'number') {
            throw new Error('post.page est requis');
        }

        const postData = {
            Content: post.content,
            Page: post.page,
            JVCTopicId: topicId
        };

        if (userId) {
            postData.UserId = userId;
        } else if (post.username) {
            postData.Username = post.username;
        } else {
            throw new Error('Vous devez être connecté ou renseigné le champ post.username');
        }

        const [jvcForum] = await database
            .select('*')
            .from('JVCForum')
            .where('Id', '=', forum.id);

        // TODO: make sure the forum is real
        if (!jvcForum) {
            if (typeof forum !== 'object') {
                throw new Error('forum est requis');
            }

            if (typeof forum.id !== 'number') {
                throw new Error('forum.id est requis');
            }

            if (typeof forum.name !== 'string' || forum.name.length === 0) {
                throw new Error('forum.name est requis');
            }

            await database
                .insert({ Id: forum.id, Name: forum.name })
                .into('JVCForum');
        }

        const [jvcTopic] = await database
            .select('*')
            .from('JVCTopic')
            .where('Id', '=', topicId);

        // TODO: make sure the topic is real
        if (!jvcTopic) {
            if (typeof topic !== 'object') {
                throw new Error('topic est requis');
            }

            if (typeof topic.title !== 'string' || topic.title.length === 0) {
                throw new Error('topic.title est requis');
            }

            if (typeof topic.viewId !== 'number') {
                throw new Error('topic.viewId est requis');
            }

            if (typeof topic.firstPostDate !== 'string' || topic.firstPostDate.length === 0) {
                throw new Error('topic.firstPostDate est requis');
            }

            if (typeof topic.firstPostContent !== 'string' || topic.firstPostContent.length === 0) {
                throw new Error('topic.firstPostContent est requis');
            }

            if (typeof topic.firstPostUsername !== 'string' || topic.firstPostUsername.length === 0) {
                throw new Error('topic.firstPostUsername est requis');
            }

            const topicData = {
                Id: topicId,
                Title: topic.title,
                JVCForumId: forum.id,
                CreationDate: topic.firstPostDate,
                FirstPostContent: topic.firstPostContent,
                FirstPostUsername: topic.firstPostUsername
            };
            await database
                .insert(topicData)
                .into('JVCTopic');
        }

        const [postId] = await database
            .insert(postData, 'Id')
            .into('JVCPost');

        res.json({ postId });
    } catch (err) {
        next(err);
    }
});

// /jvc/topics/:topicId
router.get('/:topicId', async (req, res, next) => {
    try {
        const { topicId } = req.params;
        let { startDate, endDate } = req.query;

        if (typeof startDate !== 'string') {
            throw new Error('startDate est requis');
        }

        if (!endDate) {
            endDate = null;
        }

        const result = await database
            .select('*')
            .from(database.raw('"JVCTopicPostsJson"(?, ?, ?)', [topicId, startDate, endDate]));

        const topic = result.length > 0 ? result[0].JVCTopicPostsJson : null;

        res.json({ topic });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
