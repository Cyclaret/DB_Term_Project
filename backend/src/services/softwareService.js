// 소프트웨어 목록을 조회하는 service

const pool = require('../config/db');

async function getAllSoftwares() {
    const [rows] = await pool.query(
        `SELECT software_id, software_name, vendor
        FROM Software
        ORDER BY software_id`
    );

    return rows;
}

module.exports = { getAllSoftwares };