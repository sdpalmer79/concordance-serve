const {transports, createLogger, format} = require('winston');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = './files/server.log';
const logger = (function () {
    const transportsArr = [new transports.Console()];
    
    //only log to file in development
    if (env === 'development') {
        transportsArr.push(new transports.File({ filename: logFile }));
        fs.unlink(logFile, (err) => {
            if (err) {
                console.log(`Error deleting file: ${err}`)
            }
        });
    }
    return createLogger({
        level: logLevel,
        format: format.combine(
            format.timestamp(),
            format.json()
        ),
        transports: transportsArr
    });
}());

module.exports = logger;
