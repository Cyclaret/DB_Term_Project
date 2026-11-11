// Controller이므로 Service를 호출하고, 결과에 따라 HTTP Res를 생성한다.
// employeeService.js를 호출한다.

const employeeService = require('../services/employeeService');

async function getAllEmployees(req, res) {
    try {
        const employees = await employeeService.getAllEmployees();

        res.status(200).json({
            success: true,
            data: employees
        });
    } catch (error) {
        console.error('Employee 조회 오류:', error.message);

        res.status(500).json({
            success: false,
            message: '직원 목록 조회 실패'
        });
    }
}

module.exports = {
    getAllEmployees
};