// 자산 배정에 대한 routes.

const express = require('express');
const router = express.Router();
const { requireAdmin, scopeEmployeeRecords } = require('../middleware/session');

const assetAssignmentController = require('../controllers/assetAssignmentController');

// 자산 배정 내역 조회
router.get('/', scopeEmployeeRecords, assetAssignmentController.getAllAssetAssignments);

// 자산 배정
router.post('/', requireAdmin, assetAssignmentController.createAssetAssignment);

// 자산 반납
router.patch('/:id/return', requireAdmin, assetAssignmentController.returnAssetAssignment);

module.exports = router;