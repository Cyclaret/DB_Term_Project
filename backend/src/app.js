const express = require('express');
require('dotenv').config();

// const pool = require('./config/db');

// 아래가 라우팅.
const employeeRoutes = require('./routes/employeeRoutes');
const assetRoutes = require('./routes/assetRoutes');
const softwareRoutes = require('./routes/softwareRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const assetRequestRoutes = require('./routes/assetRequestRoutes');
const assetAssignmentRoutes = require('./routes/assetAssignmentRoutes');
const licenseRequestRoutes = require('./routes/licenseRequestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// home URL
app.get('/', (req, res) => {
    res.json({
        message: 'ITAMS API Server',
        status: 'running'
    });
});

// // 테스트 URL 정상 실행 시 아래 쿼리가 실행된다. 테스트용이므로 주석.
// app.get('/db-test', async (req, res) => {
//     try {
//         const [rows] = await pool.query(
//             'SELECT employee_id, name, department, role FROM Employee'
//         );

//         res.json({
//             success: true,
//             data: rows
//         });
//     } catch (error) {
//         console.error('DB Error:', error.message);

//         res.status(500).json({
//             success: false,
//             message: 'Database connection failed'
//         });
//     }
// });

// 직원 API
app.use('/api/employees', employeeRoutes);

// 자산 API
app.use('/api/assets', assetRoutes);

// 소프트웨어 API
app.use('/api/softwares', softwareRoutes);

// 라이센스 API
app.use('/api/licenses', licenseRoutes);

// 자산 신청 API
app.use('/api/asset-requests', assetRequestRoutes);

// 자산 배정 API
app.use('/api/asset-assignments', assetAssignmentRoutes);

// 라이센스 신청 API
app.use('/api/license-requests', licenseRequestRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});