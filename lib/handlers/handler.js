const { createError } = require('../common/utils');
const { getQueryParams } = require('./queryParamUtils');
const { checkHealth } = require('../common/healthCheck');

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
    }
}
