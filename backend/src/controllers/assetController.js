const assetService = require('../services/assetService');

async function getAllAssets(req, res) {
    try {
        const assets = await assetService.getAllAssets();

        res.status(200).json({
            success: true,
            data: assets
        });
    } catch (error) {
        console.error('Asset 조회 오류: ', error.message);

        res.status(500).json({
            success: false, message: '자산 목록 조회 실패'
        });
    }
}

module.exports = {
    getAllAssets
};