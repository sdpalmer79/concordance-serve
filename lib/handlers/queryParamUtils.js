const { createError, createEnum, isISODate } = require('../common/utils');
const treeUtils = require('tree-util');
const languages = require('../common/iso-639-2');

const paramValues = {
};

const paramType = createEnum(['STRING', 'NUMBER', 'FLOAT','BOOLEAN', 'ARRAY', 'DATE', 'TIMERANGE']);

const queryParams = treeUtils.buildTrees([
    {id: '/stub'},
    {name: 'param1', parentId: '/stub', id: 'param1_stub', type: paramType.STRING, isMandatory: true, caseSensitive: true},
    {id: '/words/*/*'}
], {id : 'id', parentid : 'parentId'});

const comparePaths = (path1, path2) => {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');
    if (parts1.length !== parts2.length) {
        return false;
    }
    for (let i = 0; i < parts1.length; i++) {
        if (parts1[i] !== '*' && parts1[i] !== parts2[i]) {
            return false;
        }
    }
    return true;
};

const getParamsForPath = (path) => {
    const params = [];
    path = path.toLowerCase();
    for (const tree of queryParams) {
        if (comparePaths(tree.rootNode.id, path)) {
            params.push(...tree.rootNode.children);
        }
    }
    return params.map((node) => node.dataObj);
};

const checkForUnrecognized = (req, allowedParams) => {
    for (const param in req.query){
        if (!allowedParams.find((val) => val === param)){
            throw createError(`Invalid or missing query param ${param.name}`, { httpStatus: 400});
        }
    }
};

const getParamFromReq = (req, queryParam, caseSensitive) => {
    if (req.query[queryParam] === null || req.query[queryParam] === undefined){
        return undefined;
    }
    return caseSensitive ? req.query[queryParam] : req.query[queryParam].toUpperCase();
};

const validate = (param, type) => {
    let valid = false;
    switch (type){
        case paramType.STRING: valid = typeof param === typeof 'String'; break;
        case paramType.NUMBER: valid = typeof parseInt(param) === typeof 123; break;
        case paramType.FLOAT: valid = typeof parseFloat(param) === typeof 0.5; break;
        case paramType.BOOLEAN: valid = param.toLowerCase() === 'true' || param.toLowerCase() === 'false'; break;
        case paramType.DATE: valid = isISODate(param); break;
        case paramType.ARRAY:
            param = param.split(',');
            valid = true;
            for (let i=0; i < param.length; i++){
                if (!param[i]){
                    valid = false;
                    break;
                }
            }
            break;
        case paramType.TIMERANGE:
            param = param.split('/');
            if (param.length !== 2 || !isISODate(param[0]) || !isISODate(param[1])) {
                break;
            }
            param = [new Date(param[0]), new Date(param[1])];
            if (param[0].getTime() > param[1].getTime()){
                break;
            }
            valid = true;
            break;
    }
    return valid;
};

const hasValidValue = (param, type, allowedValues, caseSensitive) => {
    if (allowedValues === undefined){
        return true;
    }
    if (!caseSensitive){
        param = param.toUpperCase();
        allowedValues = allowedValues.map((val) => val.toUpperCase());
    }
    if (type === paramType.ARRAY){
        const paramArr = param.split(',');
        return paramArr.findIndex((param) => !allowedValues.includes(param)) === -1;
    }
    return allowedValues.includes(param);
};

const parse = (param, type) => {
    let val = param;

    switch (type){
        case paramType.NUMBER:
            val = parseInt(param);
            break;
        case paramType.FLOAT:
            val = parseFloat(param);
            break;
        case paramType.BOOLEAN:
            val = param.toLowerCase() === 'true';
            break;
        case paramType.ARRAY:
            val = param.split(',');
            break;
        case paramType.DATE:
            val = new Date(param);
            break;
        case paramType.TIMERANGE:
            param = param.split('/');
            val = [new Date(param[0]), new Date(param[1])];
            break;
    }
    return val;
};

const validateAndExtract = (req, param) => {
    const paramVal = getParamFromReq(req, param.name, param.caseSensitive);

    if (!param.isMandatory && paramVal === undefined){
        return undefined;
    }
    if (!(paramVal && validate(paramVal, param.type) && hasValidValue(paramVal, param.type, param.values, param.caseSensitive))){
        throw createError(`Invalid or missing query param ${param.name}`, { httpStatus: 400});
    }
    return parse(paramVal, param.type);
};

module.exports = {
    paramValues: paramValues,
    getQueryParams: (req) => {
        const params = getParamsForPath(req.path);
        checkForUnrecognized(req, params.map((param) => param.name));

        const parsedParams = {};
        params.forEach((param) => {
            parsedParams[param.name] = validateAndExtract(req, param);
        });
        return parsedParams;
    }
};

