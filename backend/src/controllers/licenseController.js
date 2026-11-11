const licenseService = require('../services/licenseService');

async function getAllLicenses(req, res) {
    try {
        const assets = await licenseService.getAllLicenses();

        res.status(200).json({
            success: true,
            data: assets
        });
    } catch (error) {
        console.error('License 조회 오류: ', error.message);

        res.status(500).json({
            success: false, message: '라이센스 목록 조회 실패'
        });
    }
}

module.exports = {
    getAllLicenses
};