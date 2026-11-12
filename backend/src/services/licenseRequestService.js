/*
라이센스 신청에 대한 service
라이센스 신청 등록, 라이센스 신청 목록 조회, 라이센스 신청 승인 또는 거절
*/

const pool = require('../config/db');

// 라이선스 신청 등록
async function createLicenseRequest(employeeId, softwareId) {
    const [result] = await pool.execute(
        `INSERT INTO LicenseRequest (employee_id, software_id)
         VALUES (?, ?)`,
        [employeeId, softwareId]
    );

    return {
        request_id: result.insertId,
        employee_id: employeeId,
        software_id: softwareId,
        status: 'PENDING'
    };
}

// 라이선스 신청 목록 조회
async function getAllLicenseRequests() {
    const [rows] = await pool.query(
        `SELECT
            lr.request_id,
            lr.employee_id,
            e.name AS employee_name,
            lr.software_id,
            s.software_name,
            lr.request_date,
            lr.status,
            lr.processed_at,
            lr.processed_by
         FROM LicenseRequest lr
         JOIN Employee e ON lr.employee_id = e.employee_id
         JOIN Software s ON lr.software_id = s.software_id
         ORDER BY lr.request_id DESC`
    );

    return rows;
}

// 라이선스 신청 승인·거절
async function updateLicenseRequestStatus(requestId, status, adminId) {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        const error = new Error('Invalid request status');
        error.statusCode = 400;
        throw error;
    }

    // 관리자 권한 확인
    const [admins] = await pool.execute(
        `SELECT employee_id
         FROM Employee
         WHERE employee_id = ? AND role = 'ADMIN'`,
        [adminId]
    );

    if (admins.length === 0) {
        const error = new Error('관리자 권한이 없습니다.');
        error.statusCode = 403;
        throw error;
    }

    // PENDING 상태인 신청만 처리
    const [result] = await pool.execute(
        `UPDATE LicenseRequest
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
    createLicenseRequest,
    getAllLicenseRequests,
    updateLicenseRequestStatus
}; 