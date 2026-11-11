const express = require('express');
const router = express.Router();

const assetRequestController = require('../controllers/assetRequestController');

router.get('/', assetRequestController.getAllAssetRequests);
router.post('/', assetRequestController.createAssetRequest);
router.patch('/:id', assetRequestController.updateAssetRequestStatus);

module.exports = router;