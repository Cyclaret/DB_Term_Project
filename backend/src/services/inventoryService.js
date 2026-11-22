const pool = require('../config/db');

function inventoryError(statusCode, message) {
    return Object.assign(new Error(message), { statusCode });
}

async function getCategories() {
    const [rows] = await pool.query(
        'SELECT category_id, category_name FROM AssetCategory ORDER BY category_name'
    );
    return rows;
}

async function createAsset(categoryId, name, status) {
    const [result] = await pool.execute(
        'INSERT INTO Asset (category_id, asset_name, status) VALUES (?, ?, ?)',
        [categoryId, name, status]
    );
    return result.insertId;
}

async function updateAsset(assetId, categoryId, name, status) {
    const [result] = await pool.execute(
        `UPDATE Asset
         SET category_id = ?, asset_name = ?, status = COALESCE(?, status)
         WHERE asset_id = ?
           AND (status <> 'ASSIGNED' OR (category_id = ? AND ? IS NULL))`,
        [categoryId, name, status, assetId, categoryId, status]
    );
    if (result.affectedRows > 0) return;

    const [[asset]] = await pool.execute('SELECT asset_id FROM Asset WHERE asset_id = ?', [assetId]);
    if (!asset) throw inventoryError(404, '자산을 찾을 수 없습니다.');
    throw inventoryError(409, '배정 중인 자산의 종류나 상태를 변경하려면 먼저 회수해 주세요.');
}

async function deleteAsset(assetId) {
    const [result] = await pool.execute('DELETE FROM Asset WHERE asset_id = ?', [assetId]);
    if (result.affectedRows === 0) throw inventoryError(404, '자산을 찾을 수 없습니다.');
}

async function createSoftware(name, vendor) {
    const [result] = await pool.execute(
        'INSERT INTO Software (software_name, vendor) VALUES (?, ?)',
        [name, vendor]
    );
    return result.insertId;
}

async function updateSoftware(softwareId, name, vendor) {
    const [result] = await pool.execute(
        'UPDATE Software SET software_name = ?, vendor = ? WHERE software_id = ?',
        [name, vendor, softwareId]
    );
    if (result.affectedRows === 0) throw inventoryError(404, '소프트웨어를 찾을 수 없습니다.');
}

async function createLicense(softwareId, seats, expiration) {
    const [result] = await pool.execute(
        'INSERT INTO License (software_id, total_seats, expiration_date) VALUES (?, ?, ?)',
        [softwareId, seats, expiration]
    );
    return result.insertId;
}

async function updateLicense(licenseId, seats, expiration) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 신규 배정과 좌석 수 변경은 같은 License 행을 먼저 잠근다.
        const [[license]] = await connection.execute(
            'SELECT license_id FROM License WHERE license_id = ? FOR UPDATE',
            [licenseId]
        );
        if (!license) throw inventoryError(404, '라이선스를 찾을 수 없습니다.');

        const [[usage]] = await connection.execute(
            'SELECT COUNT(*) AS used FROM LicenseAssignment WHERE license_id = ? AND returned_at IS NULL',
            [licenseId]
        );
        if (seats < Number(usage.used)) {
            throw inventoryError(409, '사용 중인 좌석보다 총 좌석 수를 줄일 수 없습니다.');
        }

        await connection.execute(
            'UPDATE License SET total_seats = ?, expiration_date = ? WHERE license_id = ?',
            [seats, expiration, licenseId]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    getCategories, createAsset, updateAsset, deleteAsset, createSoftware, updateSoftware,
    createLicense, updateLicense
};
