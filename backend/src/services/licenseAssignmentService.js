const pool = require('../config/db');

function httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// 1. 라이선스 배정 내역 조회
async function getAllLicenseAssignments() {
    const [rows] = await pool.query(`
        SELECT
            la.assignment_id,
            la.employee_id,
            e.name AS employee_name,
            la.license_id,
            s.software_name,
            la.request_id,
            la.assigned_at,
            la.returned_at
        FROM LicenseAssignment la
        JOIN Employee e ON la.employee_id = e.employee_id
        JOIN License l ON la.license_id = l.license_id
        JOIN Software s ON l.software_id = s.software_id
        ORDER BY la.assignment_id DESC
    `);

    return rows;
}

// 2. 승인된 신청에 라이선스 배정
async function createLicenseAssignment(requestId, licenseId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [[request]] = await connection.execute(
            `SELECT employee_id, software_id, status
             FROM LicenseRequest
             WHERE request_id = ?
             FOR UPDATE`,
            [requestId]
        );

        if (!request) {
            throw httpError('신청이 존재하지 않습니다.', 404);
        }
        if (request.status !== 'APPROVED') {
            throw httpError('승인된 신청만 배정할 수 있습니다.', 409);
        }

        // 같은 라이선스에 대한 배정을 한 번에 하나씩 처리한다.
        const [[license]] = await connection.execute(
            `SELECT software_id, total_seats, expiration_date < CURRENT_DATE AS is_expired
             FROM License
             WHERE license_id = ?
             FOR UPDATE`,
            [licenseId]
        );

        if (!license) {
            throw httpError('라이선스가 존재하지 않습니다.', 404);
        }
        if (license.software_id !== request.software_id) {
            throw httpError('신청 소프트웨어와 라이선스가 일치하지 않습니다.', 409);
        }
        if (license.is_expired) {
            throw httpError('만료된 라이선스입니다.', 409);
        }

        const [[existing]] = await connection.execute(
            `SELECT assignment_id
             FROM LicenseAssignment
             WHERE request_id = ?`,
            [requestId]
        );

        if (existing) {
            throw httpError('이미 배정 이력이 있는 신청입니다.', 409);
        }

        const [[usage]] = await connection.execute(
            `SELECT COUNT(*) AS used_seats
             FROM LicenseAssignment
             WHERE license_id = ? AND returned_at IS NULL`,
            [licenseId]
        );

        if (usage.used_seats >= license.total_seats) {
            throw httpError('배정 가능한 라이선스 좌석이 없습니다.', 409);
        }

        const [result] = await connection.execute(
            `INSERT INTO LicenseAssignment (employee_id, license_id, request_id)
             VALUES (?, ?, ?)`,
            [request.employee_id, licenseId, requestId]
        );

        await connection.commit();

        return {
            assignment_id: result.insertId,
            employee_id: request.employee_id,
            license_id: licenseId,
            request_id: requestId
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 3. 반납 시각을 기록하고 배정 이력을 보존한다.
async function returnLicenseAssignment(assignmentId) {
    const [result] = await pool.execute(
        `UPDATE LicenseAssignment
         SET returned_at = CURRENT_TIMESTAMP
         WHERE assignment_id = ? AND returned_at IS NULL`,
        [assignmentId]
    );

    if (result.affectedRows === 0) {
        const [[assignment]] = await pool.execute(
            `SELECT assignment_id
             FROM LicenseAssignment
             WHERE assignment_id = ?`,
            [assignmentId]
        );

        if (!assignment) {
            throw httpError('배정 내역이 존재하지 않습니다.', 404);
        }

        throw httpError('이미 반납된 라이선스입니다.', 409);
    }

    return { assignment_id: assignmentId };
}

module.exports = {
    getAllLicenseAssignments,
    createLicenseAssignment,
    returnLicenseAssignment
};
