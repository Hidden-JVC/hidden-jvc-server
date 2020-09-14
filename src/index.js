require('dotenv').config();

const api = require('./api.js');
const socket = require('./socket.js');
const database = require('./database.js');

process.on('SIGINT', () => {
    console.log('shutting down...');
    api.close();
    socket.io.close();
    socket.server.close();
    database.destroy();
});
