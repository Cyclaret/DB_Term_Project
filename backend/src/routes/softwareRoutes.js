const express = require('express');
const router = express.Router();
const inventory = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/session');

const softwareController = require('../controllers/softwareController');

router.get('/', softwareController.getAllSoftwares);

router.post('/', requireAdmin, inventory.createSoftware);
router.put('/:id', requireAdmin, inventory.updateSoftware);

module.exports = router;