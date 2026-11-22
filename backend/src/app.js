const express = require('express');
const path = require('node:path');
require('dotenv').config();

const { login, logout, requireSession, requireAdmin } = require('./middleware/session');
const inventory = require('./controllers/inventoryController');

// 아래가 라우팅.
const employeeRoutes = require('./routes/employeeRoutes');
const assetRoutes = require('./routes/assetRoutes');
const softwareRoutes = require('./routes/softwareRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const assetRequestRoutes = require('./routes/assetRequestRoutes');
const assetAssignmentRoutes = require('./routes/assetAssignmentRoutes');
const licenseRequestRoutes = require('./routes/licenseRequestRoutes');
const licenseAssignmentRoutes = require('./routes/licenseAssignmentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const frontend = path.join(__dirname, '..', '..', 'frontend');

app.disable('x-powered-by');

app.use(express.json());

// home URL
app.get('/', (req, res) => {
    res.json({
        message: 'ITAMS API Server',
        status: 'running'
    });
});

// 프런트엔드와 API를 같은 서버에서 제공한다.
app.use('/ui', express.static(frontend));
app.get('/admin', (req, res) => res.redirect('/ui/'));

app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
app.post('/api/session', login);
app.delete('/api/session', logout);
app.use('/api', requireSession);
app.get('/api/session', (req, res) => res.json({ success: true, data: req.employee }));
app.get('/api/asset-categories', inventory.getCategories);

// 직원 API
app.use('/api/employees', requireAdmin, employeeRoutes);

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

// 라이선스 배정 API
app.use('/api/license-assignments', licenseAssignmentRoutes);

app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API 경로를 찾을 수 없습니다.' });
});

app.use((error, req, res, next) => {
    if (res.headersSent || !req.originalUrl.startsWith('/api/')) return next(error);

    const messages = {
        ER_NO_REFERENCED_ROW_2: [400, '참조한 카테고리 또는 소프트웨어를 찾을 수 없습니다.'],
        ER_ROW_IS_REFERENCED_2: [409, '배정 이력이 있는 자산은 삭제할 수 없습니다.']
    };
    const [status, message] = messages[error.code] || [
        error.statusCode || 500,
        error.type === 'entity.parse.failed' ? '요청 본문 형식을 확인해 주세요.' : error.message
    ];
    if (status >= 500) console.error('API 오류:', error);
    return res.status(status).json({
        success: false,
        message: status >= 500 ? '서버에서 요청을 처리하지 못했습니다.' : message
    });
});

if (require.main === module) {
    app.listen(PORT, '127.0.0.1', () => console.log('Server running on port ' + PORT));
}

module.exports = app;
