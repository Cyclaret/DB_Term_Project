// DB에서 직원 데이터를 조회하는 역할을 맡는다.

const pool = require('../config/db');

async function getAllEmployees() {
    const [rows] = await pool.query(
        `SELECT employee_id, name, department, role
         FROM Employee
         ORDER BY employee_id`
    );

    return rows;
}

module.exports = {
    getAllEmployees
};