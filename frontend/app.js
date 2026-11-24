'use strict';

const $ = id => document.getElementById(id);
const adminPages = {
    requests: '신청 관리', assets: '자산 관리', licenses: '라이선스 관리', assignments: '직원별 배정 현황'
};
const employeePages = { requests: '내 신청', assignments: '내 배정 내역' };
const routes = {
    employees: 'employees', categories: 'asset-categories', assets: 'assets', software: 'softwares',
    licenses: 'licenses', assetRequests: 'asset-requests', licenseRequests: 'license-requests',
    assetAssignments: 'asset-assignments', licenseAssignments: 'license-assignments'
};
const stateLabels = {
    AVAILABLE: '배정 가능', ASSIGNED: '배정 중', MAINTENANCE: '점검 중',
    PENDING: '승인 대기', APPROVED: '승인', REJECTED: '거절', EXPIRED: '만료'
};
const resources = {
    asset: { requests: 'assetRequests', assignments: 'assetAssignments', inventory: 'assets',
        related: 'categories', target: 'category_id', title: '자산', item: 'asset_id',
        targetName: 'category_name', itemName: 'asset_name', assignmentName: 'asset_name' },
    license: { requests: 'licenseRequests', assignments: 'licenseAssignments', inventory: 'licenses',
        related: 'software', target: 'software_id', title: '라이선스', item: 'license_id',
        targetName: 'software_name', itemName: 'software_name', assignmentName: 'software_name' }
};
const filters = {};
let employee;
let page = 'requests';
let data = {};
let busy = false;
let submitEditor;
let refreshVersion = 0;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function isAdmin() { return employee?.role === 'ADMIN'; }

async function api(path, method = 'GET', body) {
    const response = await fetch('/api/' + path, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 204) return undefined;
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.message), { status: response.status });
    return result.data;
}

function notice(text, error = false) {
    $('notice').textContent = text;
    $('notice').hidden = !text;
    $('notice').dataset.error = error;
}

function showLogin() {
    refreshVersion++;
    employee = null;
    data = {};
    Object.keys(filters).forEach(key => delete filters[key]);
    if ($('editor').open) $('editor').close();
    $('workspace').hidden = true;
    $('login').hidden = false;
    $('login-form').reset();
    $('login-form').elements.employee_id.focus();
}

function showWorkspace(account) {
    employee = account;
    page = 'requests';
    $('identity-role').textContent = isAdmin() ? '관리자' : '일반 직원';
    $('identity-name').textContent = employee.name + ' · ' + employee.department;
    $('login-error').textContent = '';
    $('login').hidden = true;
    $('workspace').hidden = false;
    notice('');
    render();
}

async function refresh() {
    const version = ++refreshVersion;
    const keys = Object.keys(routes).filter(key =>
        isAdmin() || !['employees', 'assets', 'licenses'].includes(key));
    const values = await Promise.all(keys.map(key => api(routes[key])));
    if (version !== refreshVersion) return;
    data = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
    render();
}

function handleError(error) {
    if (error.status === 401) {
        showLogin();
        $('login-error').textContent = '다시 로그인해 주세요.';
    } else {
        notice(error.message || '요청을 처리하지 못했습니다.', true);
    }
}

function button(label, action, id = '', style = 'secondary') {
    return `<button type="button" class="${style}" data-action="${action}" data-id="${escapeHtml(id)}">${label}</button>`;
}

function pill(status) {
    return `<span class="pill" data-state="${escapeHtml(status)}">${escapeHtml(stateLabels[status] || status)}</span>`;
}

function panel(title, columns, rows, actions = '') {
    const header = `<div class="panel-header"><h2>${title}</h2><div class="controls">${actions}</div></div>`;
    if (!rows.length) return `<section class="panel">${header}<p class="empty">표시할 내역이 없습니다.</p></section>`;
    const headings = columns.map(label => `<th scope="col">${label}</th>`).join('');
    const body = rows.map(row => '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>').join('');
    return `<section class="panel">${header}<div class="table-scroll"><table aria-label="${title}">
        <thead><tr>${headings}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function options(choices, selected) {
    return choices.map(([value, label]) => `<option value="${escapeHtml(value)}"
        ${String(value) === String(selected) ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function filterSelect(label, key, choices) {
    return `<label>${label}<select data-filter="${key}">${options(choices, filters[key] ?? '')}</select></label>`;
}

function timestamp(value) {
    if (!value) return '—';
    return escapeHtml(new Date(value).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }));
}

function candidates(kind, request) {
    const resource = resources[kind];
    return (data[resource.inventory] ?? []).filter(item => item[resource.target] === request[resource.target] &&
        (kind === 'asset' ? item.status === 'AVAILABLE' : !Number(item.is_expired) && Number(item.remaining_seats) > 0));
}

function requestPanel(kind) {
    const resource = resources[kind];
    const action = isAdmin() ? '' : button('신청하기', 'request-' + kind, '', 'primary');
    const assignments = new Set((data[resource.assignments] ?? []).map(row => row.request_id));
    const rows = (data[resource.requests] ?? []).filter(row => !filters.requestStatus ||
        row.status === filters.requestStatus).map(row => {
        let controls = '';
        if (isAdmin() && row.status === 'PENDING') {
            controls = button('승인', 'approve-' + kind, row.request_id, 'primary') +
                button('거절', 'reject-' + kind, row.request_id);
        }
        if (isAdmin() && row.status === 'APPROVED') {
            if (assignments.has(row.request_id)) controls = '배정 이력 있음';
            else if (candidates(kind, row).length) controls = button('배정', 'assign-' + kind, row.request_id, 'primary');
            else controls = '배정 가능한 항목 없음';
        }
        return [
            row.request_id, ...(isAdmin() ? [escapeHtml(row.employee_name)] : []),
            escapeHtml(row[resource.targetName]), pill(row.status), timestamp(row.request_date),
            ...(isAdmin() ? [`<div class="row-actions">${controls || '—'}</div>`] : [])
        ];
    });
    return panel(resource.title + ' 신청', [
        '번호', ...(isAdmin() ? ['신청자'] : []), resource.title === '자산' ? '종류' : '소프트웨어',
        '상태', '신청 시각', ...(isAdmin() ? ['처리'] : [])
    ], rows, action);
}

function assetPage() {
    const categories = (data.categories ?? []).map(row => [row.category_id, row.category_name]);
    const rows = (data.assets ?? []).filter(row =>
        (!filters.category || row.category_id === Number(filters.category)) &&
        (!filters.assetStatus || filters.assetStatus === row.status ||
            (filters.assetStatus === 'unassigned' && row.status !== 'ASSIGNED'))
    ).map(row => [
        row.asset_id, escapeHtml(row.asset_name), escapeHtml(row.category_name), pill(row.status),
        `<div class="row-actions">${button('수정', 'edit-asset', row.asset_id)}
          ${button('배정 이력', 'asset-history', row.asset_id)}
          ${button('삭제', 'delete-asset', row.asset_id, 'danger')}</div>`
    ]);
    return `<div class="controls filters">
        ${filterSelect('자산 종류', 'category', [['', '전체'], ...categories])}
        ${filterSelect('자산 상태', 'assetStatus', [['', '전체'], ['unassigned', '미배정'], ...['AVAILABLE', 'ASSIGNED', 'MAINTENANCE']
            .map(status => [status, stateLabels[status]])])}</div>` +
        panel('전체 자산', ['번호', '자산명', '종류', '상태', '관리'], rows, button('자산 등록', 'new-asset', '', 'primary'));
}

function licensePage() {
    const software = (data.software ?? []).map(row => [row.software_id, row.software_name]);
    const licenses = (data.licenses ?? []).filter(row =>
        (!filters.software || Number(filters.software) === row.software_id) &&
        (filters.licenseStatus !== 'available' || (!Number(row.is_expired) && Number(row.remaining_seats) > 0)) &&
        (filters.licenseStatus !== 'expired' || Number(row.is_expired)) &&
        (filters.licenseStatus !== 'unassigned' || Number(row.remaining_seats) === Number(row.total_seats))
    ).map(row => [
        row.license_id, escapeHtml(row.software_name), row.total_seats, row.remaining_seats,
        escapeHtml(row.expiration_day), Number(row.is_expired) ? pill('EXPIRED') : '유효',
        button('수정', 'edit-license', row.license_id)
    ]);
    const softwareRows = (data.software ?? []).map(row => [
        row.software_id, escapeHtml(row.software_name), escapeHtml(row.vendor), button('수정', 'edit-software', row.software_id)
    ]);
    return `<div class="controls filters">
        ${filterSelect('소프트웨어', 'software', [['', '전체'], ...software])}
        ${filterSelect('라이선스 상태', 'licenseStatus', [['', '전체'], ['available', '배정 가능'], ['unassigned', '미배정'], ['expired', '만료']])}
        </div>` +
        panel('라이선스', ['번호', '소프트웨어', '총 좌석', '남은 좌석', '만료일', '상태', '관리'],
            licenses, button('라이선스 등록', 'new-license', '', 'primary')) +
        panel('소프트웨어', ['번호', '소프트웨어명', '공급사', '관리'],
            softwareRows, button('소프트웨어 등록', 'new-software', '', 'primary'));
}

function assignmentPanel(kind) {
    const resource = resources[kind];
    const rows = (data[resource.assignments] ?? []).filter(row =>
        (!filters.employee || row.employee_id === Number(filters.employee)) &&
        (kind !== 'asset' || !filters.historyAsset || row.asset_id === Number(filters.historyAsset)) &&
        (!filters.onlyActive || !row.returned_at)
    ).map(row => [
        row.assignment_id, ...(isAdmin() ? [escapeHtml(row.employee_name)] : []),
        escapeHtml(row[resource.assignmentName]), timestamp(row.assigned_at), timestamp(row.returned_at),
        ...(isAdmin() ? [row.returned_at ? '—' : button('회수', 'return-' + kind, row.assignment_id)] : [])
    ]);
    return panel(resource.title + ' 배정 이력', [
        '번호', ...(isAdmin() ? ['직원'] : []), resource.title, '배정 시각', '반납 시각',
        ...(isAdmin() ? ['관리'] : [])
    ], rows);
}

function assignmentPage() {
    const employees = (data.employees ?? []).map(row => [row.employee_id, row.name + ' · ' + row.department]);
    const assets = (data.assets ?? []).map(row => [row.asset_id, row.asset_name]);
    return `<div class="controls filters">
        ${isAdmin() ? filterSelect('직원', 'employee', [['', '전체'], ...employees]) : ''}
        ${isAdmin() ? filterSelect('자산 이력', 'historyAsset', [['', '전체'], ...assets]) : ''}
        ${filterSelect('배정 상태', 'onlyActive', [['', '전체 이력'], ['1', '현재 배정 중']])}
        </div>` + assignmentPanel('asset') + assignmentPanel('license');
}

function render() {
    const pages = isAdmin() ? adminPages : employeePages;
    $('navigation').innerHTML = Object.entries(pages).map(([key, title]) =>
        `<button type="button" data-page="${key}" ${key === page ? 'aria-current="page"' : ''}>${title}</button>`).join('');
    $('page-title').textContent = pages[page];
    const views = {
        assets: assetPage, licenses: licensePage, assignments: assignmentPage,
        requests: () => `<div class="controls filters">${filterSelect('처리 상태', 'requestStatus',
            [['', '전체'], ...['PENDING', 'APPROVED', 'REJECTED'].map(key => [key, stateLabels[key]])])}</div>` +
            requestPanel('asset') + requestPanel('license')
    };
    $('view').innerHTML = views[page]();
}

function field(label, name, value = '', type = 'text', constraints = '') {
    return `<label>${label}<input type="${type}" name="${name}" value="${escapeHtml(value)}" ${constraints} required></label>`;
}

function selectField(label, name, choices, selected = '') {
    return `<label>${label}<select name="${name}" required>${options([['', '선택'], ...choices], selected)}</select></label>`;
}

function edit(title, fields, send, submitLabel = '저장') {
    $('editor-title').textContent = title;
    $('editor-fields').innerHTML = fields;
    $('editor-error').textContent = '';
    $('save-editor').textContent = submitLabel;
    submitEditor = send;
    $('editor').showModal();
}

function values(form) { return Object.fromEntries(new FormData(form)); }

function editAsset(row) {
    const categories = (data.categories ?? []).map(category => [category.category_id, category.category_name]);
    const assigned = row?.status === 'ASSIGNED';
    const statuses = ['AVAILABLE', 'MAINTENANCE'].map(key => [key, stateLabels[key]]);
    const fields = field('자산명', 'asset_name', row?.asset_name, 'text', 'maxlength="100"') +
        (assigned ? `<p>종류 ${escapeHtml(row.category_name)} · 배정 중</p>` :
            selectField('자산 종류', 'category_id', categories, row?.category_id)) +
        (assigned ? '' : selectField('상태', 'status', statuses, row?.status ?? 'AVAILABLE'));

    edit(row ? '자산 수정' : '자산 등록', fields, form => {
        const entry = values(form);
        return api(row ? 'assets/' + row.asset_id : 'assets', row ? 'PUT' : 'POST', {
            asset_name: entry.asset_name,
            category_id: assigned ? row.category_id : Number(entry.category_id),
            status: entry.status
        });
    });
}

function editSoftware(row) {
    edit(row ? '소프트웨어 수정' : '소프트웨어 등록',
        field('소프트웨어명', 'software_name', row?.software_name, 'text', 'maxlength="100"') +
        field('공급사', 'vendor', row?.vendor, 'text', 'maxlength="100"'),
        form => api(row ? 'softwares/' + row.software_id : 'softwares', row ? 'PUT' : 'POST', values(form)));
}

function editLicense(row) {
    const software = (data.software ?? []).map(item => [item.software_id, item.software_name]);
    const softwareField = row ? `<p>소프트웨어 · ${escapeHtml(row.software_name)}</p>` :
        selectField('소프트웨어', 'software_id', software);

    edit(row ? '라이선스 수정' : '라이선스 등록', softwareField +
        field('총 좌석 수', 'total_seats', row?.total_seats, 'number', 'min="1" max="2147483647" step="1"') +
        field('만료일', 'expiration_date', row?.expiration_day, 'date', 'min="1000-01-01" max="9999-12-31"'),
        form => {
            const entry = values(form);
            return api(row ? 'licenses/' + row.license_id : 'licenses', row ? 'PUT' : 'POST', {
                ...(row ? {} : { software_id: Number(entry.software_id) }),
                total_seats: Number(entry.total_seats), expiration_date: entry.expiration_date
            });
        });
}

function editRequest(kind) {
    const resource = resources[kind];
    const choices = (data[resource.related] ?? []).map(row => [row[resource.target], row[resource.targetName]]);
    edit(resource.title + ' 신청', selectField('신청 항목', 'target', choices), form =>
        api(routes[resource.requests], 'POST', { [resource.target]: Number(values(form).target) }), '신청');
}

function editAssignment(kind, id) {
    const resource = resources[kind];
    const request = data[resource.requests].find(row => row.request_id === id);
    const choices = candidates(kind, request).map(row => [
        row[resource.item], '#' + row[resource.item] + ' ' + row[resource.itemName] +
            (kind === 'license' ? ' · 남은 좌석 ' + row.remaining_seats : '')
    ]);
    edit(resource.title + ' 배정', selectField('배정할 항목', 'item', choices), form =>
        api(routes[resource.assignments], 'POST', {
            request_id: id, [resource.item]: Number(values(form).item)
        }), '배정');
}

async function perform(send, errorTarget) {
    if (busy) return;
    busy = true;
    $('save-editor').disabled = true;
    $('cancel-editor').disabled = true;
    try {
        await send();
        if ($('editor').open) $('editor').close();
        notice('요청을 처리했습니다.');
        try {
            await refresh();
        } catch (error) {
            if (error.status === 401) handleError(error);
            else notice('변경 사항은 저장되었습니다. 목록을 새로고침해 주세요.', true);
        }
    } catch (error) {
        if (errorTarget && error.status !== 401) errorTarget.textContent = error.message;
        else handleError(error);
    } finally {
        $('save-editor').disabled = false;
        $('cancel-editor').disabled = false;
        busy = false;
    }
}

function inventoryAction(action, kind, id) {
    const editors = { asset: editAsset, license: editLicense, software: editSoftware };
    const keys = { asset: 'assets', license: 'licenses', software: 'software' };
    const row = action === 'edit' ? data[keys[kind]].find(item => item[kind + '_id'] === id) : null;
    editors[kind](row);
}

function actionClick(event) {
    const target = event.target.closest('button[data-action]');
    if (!target || busy) return;
    const id = Number(target.dataset.id);
    const [action, kind] = target.dataset.action.split('-');
    const resource = resources[kind];

    switch (action) {
        case 'new':
        case 'edit': inventoryAction(action, kind, id); break;
        case 'delete': {
            const asset = data.assets.find(row => row.asset_id === id);
            edit('자산 삭제', `<p>‘${escapeHtml(asset.asset_name)}’ 자산을 삭제하시겠습니까?</p>`,
                () => api('assets/' + id, 'DELETE'), '삭제');
            break;
        }
        case 'asset':
            filters.historyAsset = String(id);
            delete filters.employee;
            delete filters.onlyActive;
            page = 'assignments';
            render();
            break;
        case 'request': editRequest(kind); break;
        case 'assign': editAssignment(kind, id); break;
        case 'approve':
        case 'reject':
            void perform(() => api(routes[resource.requests] + '/' + id, 'PATCH',
                { status: action === 'approve' ? 'APPROVED' : 'REJECTED' }));
            break;
        case 'return':
            edit(resource.title + ' 회수', '<p>이 배정을 회수하시겠습니까?</p>',
                () => api(routes[resource.assignments] + '/' + id + '/return', 'PATCH'), '회수');
            break;
    }
}

$('view').addEventListener('click', actionClick);
$('view').addEventListener('change', event => {
    const key = event.target.dataset.filter;
    if (key) {
        filters[key] = event.target.value;
        render();
        $('view').querySelector('[data-filter="' + key + '"]')?.focus();
    }
});
$('navigation').addEventListener('click', event => {
    const target = event.target.closest('button[data-page]');
    if (!target) return;
    page = target.dataset.page;
    notice('');
    render();
    $('navigation').querySelector('[aria-current="page"]')?.focus();
});
$('editor-form').addEventListener('submit', event => {
    event.preventDefault();
    void perform(() => submitEditor(event.currentTarget), $('editor-error'));
});
$('editor').addEventListener('cancel', event => {
    if (busy) event.preventDefault();
});
$('cancel-editor').addEventListener('click', () => $('editor').close());
$('refresh').addEventListener('click', () => {
    if (busy) return;
    notice('');
    void refresh().catch(handleError);
});
$('logout').addEventListener('click', async () => {
    if (busy) return;
    try {
        await api('session', 'DELETE');
        showLogin();
    } catch (error) {
        handleError(error);
    }
});
$('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    busy = submit.disabled = true;
    try {
        const account = await api('session', 'POST', { employee_id: Number(values(form).employee_id) });
        showWorkspace(account);
        await refresh().catch(handleError);
    } catch (error) {
        $('login-error').textContent = error.message;
    } finally {
        busy = submit.disabled = false;
    }
});

(async () => {
    try {
        showWorkspace(await api('session'));
        await refresh().catch(handleError);
    } catch (error) {
        showLogin();
        if (error.status !== 401) $('login-error').textContent = error.message;
    }
})();
