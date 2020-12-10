const server = require('http').createServer();
const io = require('socket.io')(server);

const database = require('./database.js');
const validateJwt = require('./helpers/validateJwt.js');

const forums = {};
const topics = {};

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const user = {};
    let forumId = null;
    let topicKey = null;

    socket.on('get-users-count', async (data, callback) => {
        if (typeof data.forumId !== 'number') {
            return;
        }
        forumId = data.forumId;

        if (typeof data.jwt === 'string') {
            const { userId, userName } = await validateJwt(data.jwt);
            const users = await database.select('ProfilePicture').from('User').where('Id', '=', userId);
            if (users.length === 0) {
                return;
            }
            user.userId = userId;
            user.userName = userName;
            user.profilePicture = users[0].ProfilePicture;
        }

        if (!Object.prototype.hasOwnProperty.call(forums, forumId)) {
            forums[forumId] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(forums[forumId], ip)) {
            forums[forumId][ip] = user;
        }

        if (typeof data.topicId === 'number' && typeof data.hidden === 'boolean') {
            topicKey = `${forumId}-${data.hidden ? 1 : 0}-${data.topicId}`;

            if (!Object.prototype.hasOwnProperty.call(topics, topicKey)) {
                topics[topicKey] = {};
            }

            if (!Object.prototype.hasOwnProperty.call(topics[topicKey], ip)) {
                topics[topicKey][ip] = user;
            }
        }

        const forumUsers = [];
        for (const ip in forums[forumId]) {
            forumUsers.push(forums[forumId][ip]);
        }

        const result = {
            forumCount: Object.keys(forums[forumId]).length,
            forumUsers
        };

        if (topicKey !== null) {
            const topicUsers = [];
            for (const ip in topics[topicKey]) {
                topicUsers.push(topics[topicKey][ip]);
            }
            result.topicCount = Object.keys(topics[topicKey]).length;
            result.topicUsers = topicUsers;
        }

        callback(result);
    });

    socket.on('disconnect', () => {
        if (forumId === null) {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(forums, forumId) && Object.prototype.hasOwnProperty.call(forums[forumId], ip)) {
            delete forums[forumId][ip];
            if (Object.keys(forums[forumId]).length === 0) {
                delete forums[forumId];
            }
        }

        if (Object.prototype.hasOwnProperty.call(topics, topicKey) && Object.prototype.hasOwnProperty.call(topics[topicKey], ip)) {
            delete topics[topicKey][ip];
            if (Object.keys(topics[topicKey]).length === 0) {
                delete topics[topicKey];
            }
        }
    });
});

const port = process.env.SOCKET_PORT;
server.listen(port, () => console.log(`socket listening on port: ${port}`));

module.exports = { io, server };
