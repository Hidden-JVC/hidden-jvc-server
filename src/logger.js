const winston = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const format = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf((info) => `${info.timestamp} - ${info.level} - ${info.message}`)
);

const logger = winston.createLogger({
    level: isProduction ? 'error' : 'debug',
    format,
    transports: [
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/debug.log', level: 'debug' })
    ]
});

const accessLogger = winston.createLogger({
    level: 'info',
    format,
    transports: [
        new winston.transports.File({ filename: './logs/access.log', level: 'info' })
    ]
});

const sqlLogger = winston.createLogger({
    level: 'info',
    format,
    transports: [
        new winston.transports.File({ filename: './logs/sql.log', level: 'info' })
    ]
});

if (!isProduction) {
    logger.add(new winston.transports.Console({ format }));
    accessLogger.add(new winston.transports.Console({ format }));
    sqlLogger.add(new winston.transports.Console({ format }));
}

module.exports = { logger, accessLogger, sqlLogger };
