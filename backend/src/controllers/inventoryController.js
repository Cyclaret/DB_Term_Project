const inventory = require('../services/inventoryService');

function invalid(message) {
    throw Object.assign(new Error(message), { statusCode: 400 });
}

function positiveInt(value, label) {
    if (!Number.isInteger(value) || value < 1 || value > 2147483647) invalid(label + ' 값을 확인해 주세요.');
    return value;
}

function requiredText(value, label) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || [...text].length > 100) invalid(label + '을(를) 1~100자로 입력해 주세요.');
    return text;
}

function assetFields(body) {
    const { category_id, asset_name, status = null } = body ?? {};
    if (status !== null && !['AVAILABLE', 'MAINTENANCE'].includes(status)) {
        invalid('자산 상태는 배정 가능 또는 점검 중으로 입력해 주세요.');
    }
    return [positiveInt(category_id, '카테고리'), requiredText(asset_name, '자산명'), status];
}

function softwareFields(body) {
    const { software_name, vendor } = body ?? {};
    return [requiredText(software_name, '소프트웨어명'), requiredText(vendor, '공급사')];
}

function licenseFields(body) {
    const { total_seats, expiration_date } = body ?? {};
    if (typeof expiration_date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(expiration_date)) {
        invalid('유효한 만료일을 입력해 주세요.');
    }
    const date = new Date(expiration_date + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== expiration_date) {
        invalid('유효한 만료일을 입력해 주세요.');
    }
    return [positiveInt(total_seats, '총 좌석 수'), expiration_date];
}

function created(res, key, id) {
    return res.status(201).json({ success: true, data: { [key]: id } });
}

function updated(res) {
    return res.json({ success: true });
}

async function getCategories(req, res) {
    return res.json({ success: true, data: await inventory.getCategories() });
}

async function createAsset(req, res) {
    const [category, name, status] = assetFields(req.body);
    return created(res, 'asset_id', await inventory.createAsset(category, name, status ?? 'AVAILABLE'));
}

async function updateAsset(req, res) {
    const id = positiveInt(Number(req.params.id), '자산 번호');
    await inventory.updateAsset(id, ...assetFields(req.body));
    return updated(res);
}

async function deleteAsset(req, res) {
    const id = positiveInt(Number(req.params.id), '자산 번호');
    await inventory.deleteAsset(id);
    return res.status(204).end();
}

async function createSoftware(req, res) {
    return created(res, 'software_id', await inventory.createSoftware(...softwareFields(req.body)));
}

async function updateSoftware(req, res) {
    const id = positiveInt(Number(req.params.id), '소프트웨어 번호');
    await inventory.updateSoftware(id, ...softwareFields(req.body));
    return updated(res);
}

async function createLicense(req, res) {
    const id = positiveInt(req.body?.software_id, '소프트웨어 번호');
    return created(res, 'license_id', await inventory.createLicense(id, ...licenseFields(req.body)));
}

async function updateLicense(req, res) {
    const id = positiveInt(Number(req.params.id), '라이선스 번호');
    await inventory.updateLicense(id, ...licenseFields(req.body));
    return updated(res);
}

module.exports = {
    getCategories, createAsset, updateAsset, deleteAsset, createSoftware, updateSoftware,
    createLicense, updateLicense
};
