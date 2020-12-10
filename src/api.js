const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const routes = require('./routes');
const { authenticate } = require('./middlewares');
const { accessLogger, logger } = require('./helpers/logger.js');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const getDurationInMilliseconds = (start) => {
    const NS_PER_SEC = 1e9;
    const NS_TO_MS = 1e6;
    const diff = process.hrtime(start);

    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

app.use(authenticate);

app.set('trust proxy', 'loopback');

// logs every requests
app.use(function (req, res, next) {
    const start = process.hrtime();

    let message = `${req.method} - ${req.originalUrl}`;
    const { userName } = res.locals;
    if (userName) {
        message = `${message} - ${userName}`;
    }
    if (req.method === 'POST') {
        message = `${message} - ${JSON.stringify(req.body)}`;
    }

    res.locals.debug = req.query.debug === '1';
    res.locals.ip = req.ip;

    message = `${message} - ${res.locals.ip}`;

    res.on('finish', () => {
        const duration = getDurationInMilliseconds(start);
        message = `${message} - ${duration.toLocaleString()} ms`;
        accessLogger.info(message);
    });

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
    logger.error(err.stack);
    res.status(500).json({
        error: err.message
    });
});

const port = process.env.API_PORT;
const server = app.listen(port, () => console.log(`api listening on port: ${port}`));

module.exports = server;
