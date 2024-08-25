const express = require('express');
const router = new express.Router();
const { getWord, postWord, getText, getBibleInfo, getHealth } = require('../handlers/handler')

router.route('/manage/health')
    .get(getHealth);

router.route('/word/:id')
    .get(getWord);

router.route('/word/:id')
    .post(postWord);

router.route('/text/:book/:chapter/:verse?/:wordCount?')
    .get(getText);

router.route('/info/bible')
    .get(getBibleInfo);

router.route('/info/chapter')
    .get(countChapters);

router.all('*', function(req, res) {
    res.status(404);
    res.end();
});

module.exports = router;

