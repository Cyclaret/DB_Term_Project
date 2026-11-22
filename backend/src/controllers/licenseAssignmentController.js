/*
라이선스 배정 내역 조회
승인된 신청에 한해 라이선스 배정
배정된 라이선스 반납

위 세 기능(service)에 대한 컨트롤러.
*/

const licenseAssignmentService = require('../services/licenseAssignmentService');

// 1. 라이선스 배정 내역 조회
async function getAllLicenseAssignments(req, res) {
    try {
        const assignments = await licenseAssignmentService.getAllLicenseAssignments(req.recordEmployeeId);

        res.status(200).json({
            success: true,
            data: assignments
        });

    } catch (error) {
        console.error('라이선스 배정 내역 조회 오류:', error);

        res.status(500).json({
            success: false,
            message: '라이선스 배정 내역 조회 실패'
        });
    }
}

// 2. 승인된 신청에 라이선스 배정
async function createLicenseAssignment(req, res) {
    try {
        const { request_id, license_id } = req.body ?? {};

        // 입력값 검증
        if (
            !Number.isSafeInteger(request_id) || request_id <= 0 ||
            !Number.isSafeInteger(license_id) || license_id <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: '유효한 신청 ID와 라이선스 ID를 입력해야 합니다.'
            });
        }

        const result = await licenseAssignmentService.createLicenseAssignment(
            request_id,
            license_id
        );

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('라이선스 배정 오류:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : '라이선스 배정 실패'
        });
    }
}

// 3. 배정된 라이선스 반납
async function returnLicenseAssignment(req, res) {
    try {
        const assignmentId = Number(req.params.id);

        // 입력값 검증
        if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: '유효한 배정 ID를 입력해야 합니다.'
            });
        }

        const result = await licenseAssignmentService.returnLicenseAssignment(
            assignmentId
        );

        res.status(200).json({
            success: true,
            message: '라이선스이 정상적으로 반납되었습니다.',
            data: result
        });

    } catch (error) {
        console.error('라이선스 반납 오류:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : '라이선스 반납 실패'
        });
    }
}

module.exports = {
    getAllLicenseAssignments,
    createLicenseAssignment,
    returnLicenseAssignment
};
