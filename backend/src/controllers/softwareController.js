const softwareService = require('../services/softwareService');

async function getAllSoftwares(req, res) {
    try {
        const softwares = await softwareService.getAllSoftwares();

        res.status(200).json({
            success: true,
            data: softwares
        });
    } catch (error) {
        console.error('Software 조회 오류: ', error.message);

        res.status(500).json({
            success: false, message: '소프트웨어 목록 조회 실패'
        });
    }
}

module.exports = { getAllSoftwares };