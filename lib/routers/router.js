const express = require('express');
const router = new express.Router();
const { getHealth, getWord, postWord, getText, getBibleInfo, getChaptersInfo, getVersesInfo } = require('../handlers/handler')

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

router.route('/info/chapters/:book')
    .get(getChaptersInfo);

router.route('/info/verses/:book/:chapter')
    .get(getVersesInfo);

router.all('*', function(req, res) {
    res.status(404);
    res.end();
});

module.exports = router;

