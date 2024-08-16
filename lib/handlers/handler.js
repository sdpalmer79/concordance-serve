const { createError } = require('../common/utils');
const { getQueryParams } = require('./queryParamUtils');
const { checkHealth } = require('../common/healthCheck');
const mongo = require('../storage/mongo');

function handleError(req, res, error) {
    req.logger.error(error.message);
    res.status(error.params?.httpStatus || 500);
    res.end(error.message);
}

module.exports = {
    getHealth: async (req, res) => {
        try {
            const isHealthy = await checkHealth();
            res.status(isHealthy ? 200 : 503);
            res.end();
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getWords: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const bookId = Number(req.params.book);
            const chapterId = Number(req.params.chapter);
            
            // Fetch words from the database
            const result = await mongo.getDb().collection('words')
            .find({ book: bookId, chapter: chapterId })
            .toArray();
            
            // Return the words
            res.json(result)
            .status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }
    }
}
