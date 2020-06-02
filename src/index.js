require('dotenv').config();

const api = require('./api.js');
const socket = require('./socket.js');
const database = require('./database.js');

process.on('SIGINT', () => {
    api.close();
    socket.close();
    database.destroy();
});
