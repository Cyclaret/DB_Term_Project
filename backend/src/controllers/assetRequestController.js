// POST 방식으로 동작하기에 body로 데이터를 보낸다.

const assetRequestService = require('../services/assetRequestService');

async function createAssetRequest(req, res) {
    try {
        const employeeId = req.employee.employee_id;
        const categoryId = req.body?.category_id;
        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
            return res.status(400).json({ success: false, message: '유효한 카테고리를 선택해 주세요.' });
        }

        const result = await assetRequestService.createAssetRequest(
            employeeId, categoryId
        );

        res.status(201).json({
            success: true, request_id: result.request_id
        });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ success: false, message: '직원 또는 카테고리를 찾을 수 없습니다.' });
        }
        console.error(error);

        res.status(500).json({
            success: false, message: '자산 신청 실패'
        });
    }
}

async function getAllAssetRequests(req, res) {
    try {
        const requests = await assetRequestService.getAllAssetRequests(req.recordEmployeeId);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('자산 신청 목록 조회 오류:', error);

        res.status(500).json({
            success: false,
            message: '자산 신청 목록 조회 실패'
        });
    }
}

async function updateAssetRequestStatus(req, res) {
    try {
        const requestId = Number(req.params.id);
        const { status } = req.body ?? {};
        const adminId = req.employee.employee_id;

        // 1. 입력값 검증
        if (
            !Number.isSafeInteger(requestId) || requestId <= 0 ||
            !['APPROVED', 'REJECTED'].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: '유효한 신청 ID와 처리 상태를 입력해야 합니다.'
            });
        }

        // 2. Service 호출
        const affectedRows = await assetRequestService.updateAssetRequestStatus(
            requestId,
            status,
            adminId
        );
        
        // 3. 변경된 데이터가 없는 경우
        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '신청이 존재하지 않거나 이미 처리된 신청입니다.'
            });
        }
        
        // 4. 정상 처리
        res.status(200).json({
            success: true,
            message: `자산 신청이 ${status === 'APPROVED' ? '승인' : '거절'}되었습니다.`
        });

    } catch (error) {
        console.error('자산 신청 처리 오류:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
            ? error.message
            : '자산 신청 처리 실패'
        });
    }
}

module.exports = { createAssetRequest, getAllAssetRequests, updateAssetRequestStatus };