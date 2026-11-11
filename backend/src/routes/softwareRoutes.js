const express = require('express');
const router = express.Router();

const softwareController = require('../controllers/softwareController');

router.get('/', softwareController.getAllSoftwares);

module.exports = router;