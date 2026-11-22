const { randomBytes } = require('node:crypto');
const { getEmployeeById } = require('../services/employeeService');

const cookieName = 'itams_session';
const sessionLifetime = 8 * 60 * 60 * 1000;
const sessions = new Map();

function sessionToken(req) {
    const cookies = (req.headers.cookie || '').split(';');
    return cookies.map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}

function cookieOptions(req) {
    return { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/' };
}

async function login(req, res) {
    const employeeId = req.body?.employee_id;
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ success: false, message: '유효한 직원 번호를 입력해 주세요.' });
    }

    const employee = await getEmployeeById(employeeId);
    if (!employee) {
        return res.status(401).json({ success: false, message: '등록된 직원 번호를 확인해 주세요.' });
    }

    const now = Date.now();
    for (const [token, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(token);
    }
    sessions.delete(sessionToken(req));
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { employeeId, expiresAt: now + sessionLifetime });
    res.cookie(cookieName, token, { ...cookieOptions(req), maxAge: sessionLifetime });
    return res.json({ success: true, data: employee });
}

function logout(req, res) {
    sessions.delete(sessionToken(req));
    res.clearCookie(cookieName, cookieOptions(req));
    return res.status(204).end();
}

async function requireSession(req, res, next) {
    const token = sessionToken(req);
    const session = sessions.get(token);
    if (session && session.expiresAt > Date.now()) {
        const employee = await getEmployeeById(session.employeeId);
        if (employee) {
            req.employee = employee;
            return next();
        }
    }

    sessions.delete(token);
    return res.status(401).json({ success: false, message: '먼저 로그인해 주세요.' });
}

function requireAdmin(req, res, next) {
    if (req.employee.role === 'ADMIN') return next();
    return res.status(403).json({ success: false, message: '관리자 권한이 없습니다.' });
}

function scopeEmployeeRecords(req, res, next) {
    if (req.employee.role !== 'ADMIN') {
        req.recordEmployeeId = req.employee.employee_id;
        return next();
    }

    const employeeId = req.query.employee_id;
    if (employeeId !== undefined) {
        if (typeof employeeId !== 'string' || !/^[1-9]\d*$/.test(employeeId) ||
            !Number.isSafeInteger(Number(employeeId))) {
            return res.status(400).json({ success: false, message: '유효한 직원 번호를 입력해 주세요.' });
        }
        req.recordEmployeeId = Number(employeeId);
    }
    return next();
}

module.exports = { login, logout, requireSession, requireAdmin, scopeEmployeeRecords };
