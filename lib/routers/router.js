const express = require('express');
const router = new express.Router();
const { getWords, getHealth } = require('../handlers/handler')

router.route('/manage/health')
    .get(getHealth);

router.route('/words/:book/:chapter')
    .get(getWords);

router.all('*', function(req, res) {
    res.status(404);
    res.end();
});

module.exports = router;
