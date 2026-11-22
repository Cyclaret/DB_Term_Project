const express = require('express');
const router = express.Router();
const inventory = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/session');

const assetController = require('../controllers/assetController');

router.get('/', requireAdmin, assetController.getAllAssets);

router.post('/', requireAdmin, inventory.createAsset);
router.put('/:id', requireAdmin, inventory.updateAsset);
router.delete('/:id', requireAdmin, inventory.deleteAsset);

module.exports = router;