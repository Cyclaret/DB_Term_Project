// 자산 배정 및 반납 service
// 3개의 세부 기능: 자산 배정 내역 조회, 승인된 신청에 자산 배정, 배정된 자산 반납.
// transaction을 사용한다: .beginTransaction(), .commit(), .rollback()

const pool = require('../config/db');

// HTTP 오류 생성
function httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// 1. 자산 배정 내역 조회
async function getAllAssetAssignments() {
    const [rows] = await pool.query(`
        SELECT
            aa.assignment_id,
            aa.employee_id,
            e.name AS employee_name,
            aa.asset_id,
            a.asset_name,
            aa.request_id,
            aa.assigned_at,
            aa.returned_at
        FROM AssetAssignment aa
        JOIN Employee e ON aa.employee_id = e.employee_id
        JOIN Asset a ON aa.asset_id = a.asset_id
        ORDER BY aa.assignment_id DESC
    `);

    return rows;
}

// 2. 승인된 신청에 자산 배정
async function createAssetAssignment(requestId, assetId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 신청 조회 및 잠금
        const [requests] = await connection.execute(
            `SELECT request_id, employee_id, category_id, status
             FROM AssetRequest
             WHERE request_id = ?
             FOR UPDATE`,
            [requestId]
        );

        if (requests.length === 0) {
            throw httpError('신청이 존재하지 않습니다.', 404);
        }

        const request = requests[0];

        if (request.status !== 'APPROVED') {
            throw httpError('승인된 신청만 배정할 수 있습니다.', 409);
        }

        // 자산 조회 및 잠금
        const [assets] = await connection.execute(
            `SELECT asset_id, category_id, status
             FROM Asset
             WHERE asset_id = ?
             FOR UPDATE`,
            [assetId]
        );

        if (assets.length === 0) {
            throw httpError('자산이 존재하지 않습니다.', 404);
        }

        const asset = assets[0];

        if (asset.category_id !== request.category_id) {
            throw httpError('신청 카테고리와 자산 카테고리가 다릅니다.', 409);
        }

        if (asset.status !== 'AVAILABLE') {
            throw httpError('배정 가능한 자산이 아닙니다.', 409);
        }

        // 동일 신청에 대한 중복 배정 방지
        const [existing] = await connection.execute(
            `SELECT assignment_id
             FROM AssetAssignment
             WHERE request_id = ?
             LIMIT 1`,
            [requestId]
        );

        if (existing.length > 0) {
            throw httpError('이미 배정 이력이 있는 신청입니다.', 409);
        }

        // 배정 기록 추가
        const [result] = await connection.execute(
            `INSERT INTO AssetAssignment
                (employee_id, asset_id, request_id)
             VALUES (?, ?, ?)`,
            [request.employee_id, assetId, requestId]
        );

        // 자산 상태 변경
        await connection.execute(
            `UPDATE Asset
             SET status = 'ASSIGNED'
             WHERE asset_id = ?`,
            [assetId]
        );

        await connection.commit();

        return {
            assignment_id: result.insertId,
            employee_id: request.employee_id,
            asset_id: assetId,
            request_id: requestId
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

// 3. 배정된 자산 반납
async function returnAssetAssignment(assignmentId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 배정 내역 조회 및 잠금
        const [assignments] = await connection.execute(
            `SELECT assignment_id, asset_id, returned_at
             FROM AssetAssignment
             WHERE assignment_id = ?
             FOR UPDATE`,
            [assignmentId]
        );

        if (assignments.length === 0) {
            throw httpError('배정 내역이 존재하지 않습니다.', 404);
        }

        const assignment = assignments[0];

        if (assignment.returned_at !== null) {
            throw httpError('이미 반납된 자산입니다.', 409);
        }

        // 자산 상태 확인
        const [assets] = await connection.execute(
            `SELECT status
             FROM Asset
             WHERE asset_id = ?
             FOR UPDATE`,
            [assignment.asset_id]
        );

        if (assets.length === 0 || assets[0].status !== 'ASSIGNED') {
            throw httpError('자산 상태가 배정 중이 아닙니다.', 409);
        }

        // 반납 시간 기록
        await connection.execute(
            `UPDATE AssetAssignment
             SET returned_at = CURRENT_TIMESTAMP
             WHERE assignment_id = ?`,
            [assignmentId]
        );

        // 자산을 다시 사용 가능한 상태로 변경
        await connection.execute(
            `UPDATE Asset
             SET status = 'AVAILABLE'
             WHERE asset_id = ?`,
            [assignment.asset_id]
        );

        await connection.commit();

        return {
            assignment_id: assignmentId,
            asset_id: assignment.asset_id
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

module.exports = {
    getAllAssetAssignments,
    createAssetAssignment,
    returnAssetAssignment
};