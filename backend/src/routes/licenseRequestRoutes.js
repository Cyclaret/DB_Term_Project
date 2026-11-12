/*
GET : /api/license-requests         라이센스 신청 목록 조회
POST : /api/license-requests        라이센스 신청 등록
PATCH : /api/license-requests/:id   신청 승인 또는 거절
*/

const express = require('express');
const router = express.Router();

const licenseRequestController = require('../controllers/licenseRequestController');

router.get('/', licenseRequestController.getAllLicenseRequests);

router.post('/', licenseRequestController.createLicenseRequest);

router.patch('/:id', licenseRequestController.updateLicenseRequestStatus);

module.exports = router;