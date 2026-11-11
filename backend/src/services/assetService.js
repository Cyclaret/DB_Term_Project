// 자산 목록을 조회하는 service

const pool = require('../config/db');

async function getAllAssets() {
    const [rows] = await pool.query(
        `SELECT
            a.asset_id, a.asset_name, c.category_name, a.status
        FROM Asset a
        JOIN AssetCategory c
            ON a.category_id = c.category_id
        ORDER BY a.asset_id`
    );

    return rows;
}

module.exports = {
    getAllAssets
};