// license 목록을 조회하는 service

const pool = require('../config/db');

async function getAllLicenses() {
    const [rows] = await pool.query(
        `SELECT
            l.license_id,
            s.software_name,
            l.total_seats,
            expiration_date
        FROM License l
        JOIN Software s
            ON l.software_id = s.software_id
        ORDER BY l.license_id;`
    );

    return rows;
}

module.exports = {
    getAllLicenses
};