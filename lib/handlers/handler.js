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
    getWord: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const result = await mongo.getDb().collection('words').findOne({ _id: req?.params?.id });
            if (!result) {
                throw createError('Word not found', { httpStatus: 404 });
            }
            res.json(result)
            .status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }   
    },
    postWord: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const result = await mongo.getDb().collection('words').updateOne({ _id: req.body._id }, {
                $set: {
                    "rootId": req.body.rootId,
                    "partOfSpeech": req.body.partOfSpeech,
                    "translation": req.body.translation,
                    "components.partsOfSpeech": req.body.partsOfSpeech,
                    "components.prefix": req.body.components.prefix,
                    "components.suffix": req.body.components.suffix,
                    "components.tense": req.body.components.tense,
                    "components.person": req.body.components.person,
                    "components.gender": req.body.components.gender,
                    "components.number": req.body.components.number,
                    "components.possessive": req.body.components.possessive
                }
            });

            if (!result) {
                throw createError('Word not found', { httpStatus: 404 });
            }
            
            res.json(result)
            .status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }   
    },
    getWords: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const { book, chapter, word } = Number(req.params.book);
            const chapter = Number(req.params.chapter);
            const word = Number(req.params.word);

            if (req.params.book && book === NaN)

            if (isNaN(book) || isNaN(chapter)) {
                throw createError('Invalid book or chapter', { httpStatus: 400 });
            }
            if (req.params.word) {
                const word = Number(req.params.word);
                if (isNaN(word)) {
                    throw createError('Invalid word', { httpStatus: 400 });
                }
            }
            // Fetch words from the database
            const result = await mongo.getDb().collection('words')
            .find({ book, chapter, word })
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
