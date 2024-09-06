const { createError } = require('../common/utils');
const { getQueryParams } = require('./queryParamUtils');
const { checkHealth } = require('../common/healthCheck');
const mongo = require('../storage/mongo');

function handleError(req, res, error) {
    req.logger.error(error.message);
    res.status(error.params?.httpStatus || 500);
    res.end(error.message);
}

let wordCollection, rootCollection;
mongo.getMediator().on('db.ready', () => { 
    mongo.getWordCollection().then((result) => { wordCollection = result });
    mongo.getRootCollection().then((result) => { rootCollection = result });
});

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
            const result = await wordCollection.findOne({ _id: req?.params?.id });
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
            const updateFields = {};
            
            // Direct fields
            const directFields = ['rootId', 'translation'];
            directFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateFields[field] = req.body[field];
                }
            });
    
            // Components fields
            if (req.body.components) {
                updateFields.components = {};
                const componentsFields = ['partsOfSpeech', 'root', 'prefix', 'suffix', 'tense', 'person', 'gender', 'number', 'possessive'];
                componentsFields.forEach(field => {
                    if (req.body.components[field] !== undefined) {
                        updateFields.components[field] = req.body.components[field];
                    }
                });
            }
            
            // Update word
            if (Object.keys(updateFields).length > 0) {
                const result = await wordCollection.updateOne({ _id: req.params.id }, {
                    $set: updateFields
                });
                if (!result || result.modifiedCount === 0) {
                    throw createError('Word not found', { httpStatus: 404 });
                }
            }
            res.status(200)
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
            const book = req.params.book;
            const chapter = req.params.chapter;
            const verse = req.params.verse;
            const wordCount = req.params.wordCount;

            // Validate input
            if (isNaN(book) || isNaN(chapter)) {
                throw createError('Invalid book or chapter', { httpStatus: 400 });
            }
            if (verse && isNaN(verse)) {
                throw createError('Invalid verse', { httpStatus: 400 });
            }
            if (wordCount && isNaN(wordCount)) {
                throw createError('Invalid wordCount', { httpStatus: 400 });
            }

            // Build query
            const query = { book: Number(book), chapter: Number(chapter) };
            if (verse) {
                query.verse = Number(verse);
            }
            if (wordCount) {
                query.wordCount = Number(wordCount);
            }

            const result = await wordCollection
            .find(query, { projection: { _id: 1, wordWithSymbols: 1 } }).sort({ _id: 1 }).toArray();
            if (result.length === 0) {
                throw createError('Text not found', { httpStatus: 404 });
            }
            res.json(result)
            .status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getBooksInfo: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const result = await wordCollection.aggregate([
                { $group: { _id: '$book', maxChapter: { $max: '$chapter' } } },
                { $project: { _id: 0, book: '$_id', maxChapter: 1 } },
                { $sort: { book: 1 } }
            ]).toArray();
            if (result.length === 0) {
                throw createError('Books not found', { httpStatus: 404 });
            }
            res.json(result);
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getChaptersInfo: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const book = req.params.book;
            if (isNaN(book)) {
                throw createError('Invalid book', { httpStatus: 400 });
            }
            const result = await wordCollection.aggregate([
                { $match: { book: Number(book) } },
                { $group: { _id: { book: '$book', chapter: '$chapter' }, maxVerse: { $max: '$verse' } } },
                { $project: { _id: 0, book: '$_id.book', chapter: '$_id.chapter', maxVerse: 1 }},
                { $sort: { chapter: 1 } }
            ]).toArray();
            if (result.length === 0) {
                throw createError('Chapters not found', { httpStatus: 404 });
            }
            res.json(result);
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getVersesInfo: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const book = req.params.book;
            const chapter = req.params.chapter;
            if (isNaN(book) || isNaN(chapter)) {
                throw createError('Invalid book or chapter', { httpStatus: 400 });
            }
            const result = await wordCollection.aggregate([
                { $match: { book: Number(book), chapter: Number(chapter) } },
                { $group: { _id: { book: '$book', chapter: '$chapter', verse: '$verse' }, maxWordCount: { $max: '$wordCount' } } },
                { $project: { _id: 0, book: '$_id.book', chapter: '$_id.chapter', verse: '$_id.verse', maxWordCount: 1 } },
                { $sort: { verse: 1 } }
            ]).toArray();
            if (result.length === 0) {
                throw createError('Verses not found', { httpStatus: 404 });
            }
            res.json(result);
        } catch (error) {
            handleError(req, res, error);
        }
    },
    getRoot: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const result = await rootCollection.findOne({ _id: req?.params?.id });
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
    postRoot: async (req, res) => {
        try {
            if (!await checkHealth()) {
                throw createError('Service is not healthy', { httpStatus: 503});
            }
            const updateFields = {};
            
            // Direct fields
            const fields = ['root', 'rootMeaning'];
            fields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateFields[field] = req.body[field];
                }
            });
    
            // Update word
            if (Object.keys(updateFields).length > 0) {
                const result = await rootCollection.updateOne({ _id: req.params.id }, {
                    $set: updateFields
                });
                if (!result || result.modifiedCount === 0) {
                    throw createError('Root not found', { httpStatus: 404 });
                }
            }
            res.status(200)
            .end();
        } catch (error) {
            handleError(req, res, error);
        }   
    },
}
