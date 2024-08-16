const express = require('express');
const router = new express.Router();
const { getHealth } = require('../handlers/handler')

router.route('/manage/health')
    .get(getHealth);

router.all('*', function(req, res) {
    res.status(404);
    res.end();
});

module.exports = router;
