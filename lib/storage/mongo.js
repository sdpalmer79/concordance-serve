const logger = require('../common/logging');
const healthCheck = require('../common/healthCheck');
const retry = require('async-retry');
const { MongoClient } = require("mongodb");
const { EventEmitter } = require('events');
const eventEmitter = new EventEmitter();

const USERNAME = process.env.MONGO_USERNAME;
const PASSWORD = process.env.MONGO_PASSWORD;
const SERVER = process.env.MONGO_SERVER;
const APP_NAME = process.env.MONGO_APP_NAME;
const DB_NAME = process.env.MONGO_DB_NAME;

let dbConnect;
let db;
let dbHealth = false;

healthCheck.registerHealthCheck('mongo', () => dbHealth)

eventEmitter.on('db.ready', () => {
    logger.info('mongo ready');
    dbHealth = true;
});

eventEmitter.on('db.down', () => {
    logger.info('mongo down');
    dbHealth = false;
});

async function connect() {
    const retries = 720;

    await retry(async () => {
        logger.info('Connecting to mongo...');
        dbConnect = await MongoClient.connect(`mongodb+srv://${USERNAME}:${PASSWORD}@${SERVER}/?retryWrites=true&w=majority&appName=${APP_NAME}`);
        db = dbConnect.db(DB_NAME);
        const result = await db.admin().ping();
        if (result?.ok !== 1) {
            throw new Error('Mongo ping failed!');
        }
        eventEmitter.emit('db.ready');
    }, {
        retries,
        minTimeout: 1000,
        maxTimeout: 1000,
        onRetry: function (error, number) {
            logger.info(`Attempt ${number}/${retries + 1} to connect to mongo failed: ${error}`);
            eventEmitter.emit('db.down');
        }
    });
}

async function disconnect() {
    await dbConnect?.close();
    eventEmitter.emit('db.down');
}

module.exports = {
    init: async () => {
        await disconnect();
        await connect();
    },
    close: async () => {
        await disconnect();
    },
    getDb: () => db,
    getMediator: () => eventEmitter
};



