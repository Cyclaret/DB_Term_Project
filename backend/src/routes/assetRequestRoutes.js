const express = require('express');
const router = express.Router();
const { requireAdmin, scopeEmployeeRecords } = require('../middleware/session');

const assetRequestController = require('../controllers/assetRequestController');

router.get('/', scopeEmployeeRecords, assetRequestController.getAllAssetRequests);
router.post('/', assetRequestController.createAssetRequest);
router.patch('/:id', requireAdmin, assetRequestController.updateAssetRequestStatus);

module.exports = router;