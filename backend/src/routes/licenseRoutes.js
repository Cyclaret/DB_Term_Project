const express = require('express');
const router = express.Router();

const licenseController = require('../controllers/licenseController');

router.get('/', licenseController.getAllLicenses);

module.exports = router;