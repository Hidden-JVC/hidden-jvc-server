const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config();

const routes = require('./routes');
const database = require('./database.js');
const { authenticate } = require('./middlewares');
const { accessLogger, logger } = require('./logger.js');

const app = express();

app.use(bodyParser.json());

app.use(authenticate);
app.use(cors());

app.use(function (req, res, next) {
    // logs every requests
    let message = `${req.method} - ${req.originalUrl}`;
    const { userName } = res.locals;
    if (userName) {
        message = `${message} - ${userName}`;
    }
    if (req.method === 'POST') {
        message = `${message} - ${JSON.stringify(req.body)}`;
    }
    accessLogger.info(message);

    res.locals.debug = req.query.debug === '1';

    next();
});

app.use(routes);

// 404
app.use(function (req, res, next) {
    const err = new Error(`404 Page Not Found: ${req.originalUrl}`);
    next(err);
});

// error handler
app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
    logger.error(err.message);
    res.status(500).json({
        error: err.message
    });
});

const port = process.env.PORT;
const server = app.listen(port, () => console.log(`listening on port: ${port}`));

process.on('SIGINT', () => {
    server.close();
    database.destroy();
});
