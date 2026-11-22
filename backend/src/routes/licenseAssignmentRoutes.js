// 라이선스 배정에 대한 routes.

const express = require('express');
const router = express.Router();
const { requireAdmin, scopeEmployeeRecords } = require('../middleware/session');

const licenseAssignmentController = require('../controllers/licenseAssignmentController');

// 라이선스 배정 내역 조회
router.get('/', scopeEmployeeRecords, licenseAssignmentController.getAllLicenseAssignments);

// 라이선스 배정
router.post('/', requireAdmin, licenseAssignmentController.createLicenseAssignment);

// 라이선스 반납
router.patch('/:id/return', requireAdmin, licenseAssignmentController.returnLicenseAssignment);

module.exports = router;
