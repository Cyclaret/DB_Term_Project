// 자산 배정에 대한 routes.

const express = require('express');
const router = express.Router();

const assetAssignmentController = require('../controllers/assetAssignmentController');

// 자산 배정 내역 조회
router.get('/', assetAssignmentController.getAllAssetAssignments);

// 자산 배정
router.post('/', assetAssignmentController.createAssetAssignment);

// 자산 반납
router.patch('/:id/return', assetAssignmentController.returnAssetAssignment);

module.exports = router;