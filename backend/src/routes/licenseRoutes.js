const express = require('express');
const router = express.Router();
const inventory = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/session');

const licenseController = require('../controllers/licenseController');

router.get('/', requireAdmin, licenseController.getAllLicenses);

router.post('/', requireAdmin, inventory.createLicense);
router.put('/:id', requireAdmin, inventory.updateLicense);

module.exports = router;