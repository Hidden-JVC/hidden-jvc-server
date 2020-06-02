const server = require('http').createServer();

const io = require('socket.io')(server);

let forumsCount = {};
let topicsCount = {};

io.on('connection', (socket) => {
    const ip = socket.request.connection.remoteAddress;
    let forumId = null;
    let topicKey = null;

    socket.on('get-users-count', (data, callback) => {
        if (typeof data.forumId !== 'number') {
            return;
        }
        forumId = data.forumId;

        if (!Array.isArray(forumsCount[forumId])) {
            forumsCount[forumId] = [];
        }

        if (!forumsCount[forumId].includes(ip)) {
            forumsCount[forumId].push(ip);
        }

        if (typeof data.hidden === 'boolean' && typeof data.topicId === 'number') {
            topicKey = `${data.hidden ? 1 : 0}-${data.topicId}`;

            if (!Array.isArray(topicsCount[topicKey])) {
                topicsCount[topicKey] = [];
            }

            if (!topicsCount[topicKey].includes(ip)) {
                topicsCount[topicKey].push(ip);
            }
        }

        const result = {
            forumCount: forumsCount[forumId].length
        };

        if (topicKey !== null) {
            result.topicCount = topicsCount[topicKey].length;
        }

        callback(result);
    });

    socket.on('disconnect', () => {
        if (forumId === null) {
            return;
        }

        forumsCount[forumId] = forumsCount[forumId].filter((item) => item !== ip);
        if (forumsCount[forumId].length === 0) {
            delete forumsCount[forumId];
        }

        if (topicKey !== null) {
            topicsCount[topicKey] = topicsCount[topicKey].filter((item) => item !== ip);
            if (topicsCount[topicKey].length === 0) {
                delete topicsCount[topicKey];
            }
        }
    });
});

const port = process.env.SOCKET_PORT;
server.listen(port, () => console.log(`socket listening on port: ${port}`));

module.exports = server;
