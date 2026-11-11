// 직원의 자산 신청 service

const pool = require('../config/db');

// 직원의 자산 신청 등록.
async function createAssetRequest(employeeId, categoryId) {
    const [result] = await pool.execute(
        `INSERT INTO AssetRequest (employee_id, category_id)
        VALUES (?, ?)`,
        [employeeId, categoryId]
    );

    return {
        request_id: result.insertId,
        employee_id: employeeId,
        category_id: categoryId,
        status: 'PENDING'
    };
}

// 직원의 신청 목록 조회
async function getAllAssetRequests() {
    const [rows] = await pool.query(
        `SELECT
            ar.request_id,
            ar.employee_id,
            e.name AS employee_name,
            ar.category_id,
            c.category_name,
            ar.request_date,
            ar.status,
            ar.processed_at,
            ar.processed_by
         FROM AssetRequest ar
         JOIN Employee e
            ON ar.employee_id = e.employee_id
         JOIN AssetCategory c
            ON ar.category_id = c.category_id
         ORDER BY ar.request_id DESC`
    );

    return rows;
}

// 자산 신청 승인 또는 거절
async function updateAssetRequestStatus(requestId, status, adminId) {
    // 승인 또는 거절만 허용
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        const error = new Error('Invalid request status');
        error.statusCode = 400;
        throw error;
    }

    // 관리자 권한 확인
    const [admins] = await pool.execute(
        `SELECT employee_id
        FROM Employee
        WHERE employee_id = ?
            AND role = 'ADMIN'`,
        [adminId]
    );

    if (admins.length === 0) {
        const error = new Error('관리자 권한이 없습니다.');
        error.statusCode = 403;
        throw error;
    }

    const [result] = await pool.execute(
        `UPDATE AssetRequest
        SET status = ?,
            processed_at = CURRENT_TIMESTAMP,
            processed_by = ?
        WHERE request_id = ?
            AND status = 'PENDING'`,
        [status, adminId, requestId]
    );

    return result.affectedRows;
}

module.exports = {
    createAssetRequest,
    getAllAssetRequests,
    updateAssetRequestStatus
};