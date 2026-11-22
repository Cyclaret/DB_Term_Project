const licenseRequestService = require('../services/licenseRequestService');

// 라이선스 신청 등록
async function createLicenseRequest(req, res) {
    try {
        const employeeId = req.employee.employee_id;
        const softwareId = req.body?.software_id;

        if (
            !Number.isSafeInteger(softwareId) || softwareId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: '유효한 소프트웨어를 선택해 주세요.'
            });
        }

        const result = await licenseRequestService.createLicenseRequest(
            employeeId,
            softwareId
        );

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage?.includes('uq_licenserequest_pending')) {
            return res.status(409).json({
                success: false,
                message: '이 소프트웨어는 이미 승인 대기 중인 신청이 있습니다.'
            });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ success: false, message: '직원 또는 소프트웨어를 찾을 수 없습니다.' });
        }
        console.error('라이선스 신청 오류:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : '라이선스 신청 실패'
        });
    }
}

// 라이선스 신청 목록 조회
async function getAllLicenseRequests(req, res) {
    try {
        const requests = await licenseRequestService.getAllLicenseRequests(req.recordEmployeeId);

        res.status(200).json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('라이선스 신청 조회 오류:', error);

        res.status(500).json({
            success: false,
            message: '라이선스 신청 조회 실패'
        });
    }
}

// 라이선스 신청 승인·거절
async function updateLicenseRequestStatus(req, res) {
    try {
        const requestId = Number(req.params.id);
        const { status } = req.body ?? {};
        const adminId = req.employee.employee_id;

        if (
            !Number.isSafeInteger(requestId) || requestId <= 0 ||
            !['APPROVED', 'REJECTED'].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: '유효한 신청 ID와 처리 상태를 입력해야 합니다.'
            });
        }

        const affectedRows = await licenseRequestService.updateLicenseRequestStatus(
            requestId,
            status,
            adminId
        );

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '처리 가능한 신청이 존재하지 않습니다.'
            });
        }

        res.status(200).json({
            success: true,
            message: `라이선스 신청이 ${status} 상태로 변경되었습니다.`
        });

    } catch (error) {
        console.error('라이선스 신청 처리 오류:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : '라이선스 신청 처리 실패'
        });
    }
}

module.exports = {
    createLicenseRequest,
    getAllLicenseRequests,
    updateLicenseRequestStatus
};