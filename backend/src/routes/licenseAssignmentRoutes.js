// 라이선스 배정에 대한 routes.

const express = require('express');
const router = express.Router();

const licenseAssignmentController = require('../controllers/licenseAssignmentController');

// 라이선스 배정 내역 조회
router.get('/', licenseAssignmentController.getAllLicenseAssignments);

// 라이선스 배정
router.post('/', licenseAssignmentController.createLicenseAssignment);

// 라이선스 반납
router.patch('/:id/return', licenseAssignmentController.returnLicenseAssignment);

module.exports = router;
