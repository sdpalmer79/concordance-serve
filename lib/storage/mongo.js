const logger = require('../common/logging');
const healthCheck = require('../common/healthCheck');
const retry = require('async-retry');
const { MongoClient } = require("mongodb");
const { EventEmitter } = require('events');
const { root } = require('cheerio');
const eventEmitter = new EventEmitter();

const USERNAME = process.env.MONGO_USERNAME;
const PASSWORD = process.env.MONGO_PASSWORD;
const SERVER = process.env.MONGO_SERVER;
const APP_NAME = process.env.MONGO_APP_NAME;
const DB_NAME = process.env.MONGO_DB_NAME;

let dbConnect;
let db;
let dbStatus = 'DB_DOWN';
let wordCollection;
let rootCollection;

healthCheck.registerHealthCheck('mongo', () => dbStatus === 'DB_READY');

eventEmitter.on('db.connecting', () => {
    logger.info('connecting to mongo...');
    dbStatus = 'DB_CONNECTING';
});

eventEmitter.on('db.ready', () => {
    logger.info('mongo ready');
    dbStatus = 'DB_READY';
});

eventEmitter.on('db.down', () => {
    logger.info('mongo down');
    dbStatus = 'DB_DOWN';
});

async function connect() {
    const retries = 720;

    await retry(async () => {
        eventEmitter.emit('db.connecting');
        dbConnect = await MongoClient.connect(`mongodb+srv://${USERNAME}:${PASSWORD}@${SERVER}/?retryWrites=true&w=majority&appName=${APP_NAME}`);
        db = dbConnect.db(DB_NAME);
        const result = await db.admin().ping();
        if (result?.ok !== 1) {
            throw new Error('Mongo ping failed!');
        }
        wordCollection = db.collection('words');
        rootCollection = db.collection('roots');
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

async function pingDb() {
    if (dbStatus === 'DB_READY') {
        const result = await db.admin().ping();
        if (result?.ok !== 1) {
            await disconnect();
            await connect();
        }
    }
}

// Schedule pingDb to run every 30 seconds
setInterval(pingDb, 30000);

module.exports = {
    init: async () => {
        await disconnect();
        await connect();
    },
    close: async () => {
        await disconnect();
    },
    getDb: () => new Promise((resolve) => {
        if (dbStatus === 'DB_READY') {
            resolve(db);
        } else {
            eventEmitter.once('db.ready', () => {
                resolve(db);
            });
        }
    }),
    getWordCollection: () => new Promise((resolve) => {
        if (dbStatus === 'DB_READY') {
            resolve(wordCollection);
        } else {
            eventEmitter.once('db.ready', () => {
                resolve(wordCollection);
            });
        }
    }),
    getRootCollection: () => new Promise((resolve) => {
        if (dbStatus === 'DB_READY') {
            resolve(rootCollection);
        } else {
            eventEmitter.once('db.ready', () => {
                resolve(rootCollection);
            });
        }
    }),
    getMediator: () => eventEmitter
};



