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
                    "components.possessive": req.body.components.possessive,
                    "components.root": req.body.components.root
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
    getText: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const { book, chapter, verse, wordCount } = getQueryParams(req.params);
            if (isNaN(book) || isNaN(chapter)) {
                throw createError('Invalid book or chapter', { httpStatus: 400 });
            }
            if (verse && isNaN(verse)) {
                throw createError('Invalid verse', { httpStatus: 400 });
            }
            if (wordCount && isNaN(wordCount)) {
                throw createError('Invalid wordCount', { httpStatus: 400 });
            }
            const result = await mongo.getDb().collection('text').find({ book, chapter, verse, wordCount }, { projection: { _id: 1, wordWithSymbols: 1 } })
            if (!result) {
                throw createError('Text not found', { httpStatus: 404 });
            }
            res.json(result.toArray())
            .status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getBibleInfo: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const bibleInfo = await db.collection<Word>('words').aggregate([
                {
                    $facet: {
                        bookResults: [
                            { $group: { _id: '$book', maxChapter: { $max: '$chapter' } } },
                            { $project: { _id: 0, book: '$_id', maxChapter: 1 } }
                        ],
                        bookChapterResults: [
                            { $group: { _id: { book: '$book', chapter: '$chapter' }, maxVerse: { $max: '$verse' } } },
                            { $project: { _id: 0, book: '$_id.book', chapter: '$_id.chapter', maxVerse: 1 } }
                        ],
                        bookChapterVerseResults: [
                            { $group: { _id: { book: '$book', chapter: '$chapter', verse: '$verse' }, maxWordCount: { $max: '$wordCount' } } },
                            { $project: { _id: 0, book: '$_id.book', chapter: '$_id.chapter', verse: '$_id.verse', maxWordCount: 1 } }
                        ]
                    }
                }
            ]).toArray();
            res.json(bibleInfo[0]);
        } catch (err) {
            handleError(req, res, error);
        }
    }
}
