const server = require('http').createServer();

const io = require('socket.io')(server);

const forums = {};
const topics = {};

io.on('connection', (socket) => {
    const ip = socket.request.connection.remoteAddress;
    let forumId = null;
    let topicKey = null;

    socket.on('get-users-count', (data, callback) => {
        if (typeof data.forumId !== 'number') {
            return;
        }
        forumId = data.forumId;

        if (!Array.isArray(forums[forumId])) {
            forums[forumId] = [];
        }

        if (!forums[forumId].includes(ip)) {
            forums[forumId].push(ip);
        }

        if (typeof data.hidden === 'boolean' && typeof data.topicId === 'number') {
            topicKey = `${forumId}-${data.hidden ? 1 : 0}-${data.topicId}`;

            if (!Array.isArray(topics[topicKey])) {
                topics[topicKey] = [];
            }

            if (!topics[topicKey].includes(ip)) {
                topics[topicKey].push(ip);
            }
        }

        const result = {
            forumCount: forums[forumId].length
        };

        if (topicKey !== null) {
            result.topicCount = topics[topicKey].length;
        }

        callback(result);
    });

    socket.on('disconnect', () => {
        if (forumId === null) {
            return;
        }

        if (Array.isArray(forums[forumId])) {
            forums[forumId] = forums[forumId].filter((item) => item !== ip);
            if (forums[forumId].length === 0) {
                delete forums[forumId];
            }
        }

        if (topicKey !== null && Array.isArray(topics[topicKey])) {
            topics[topicKey] = topics[topicKey].filter((item) => item !== ip);
            if (topics[topicKey].length === 0) {
                delete topics[topicKey];
            }
        }
    });
});

const port = process.env.SOCKET_PORT;
server.listen(port, () => console.log(`socket listening on port: ${port}`));

module.exports = { io, server };
