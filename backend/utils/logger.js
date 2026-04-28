const winston = require('winston');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'akp-backend' },
    transports: [
        new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

module.exports = logger;
