// ============================================
// BestVietnam Sync API (Cloudflare Worker + D1)
// ============================================
// Аутентификация: логин + passphrase, JWT-токен
// Хранение: D1 SQLite
// Ключи базы не видны в браузере — только на сервере
// ============================================

import { Router } from './router.js';

const TOKEN_PREFIX = 'Bearer ';
const JWT_SECRET = (env) => env.JWT_SECRET;

// -----------------------------
// JWT helpers
// -----------------------------
async function signJWT(payload, secret) {
    const encoder = new TextEncoder();
    const header = { alg: 'HS256', typ: 'JWT' };
    const h = btoa(JSON.stringify(header));
    const p = btoa(JSON.stringify(payload));
    const data = `${h}.${p}`;
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return `${data}.${signature}`;
}

async function verifyJWT(token, secret) {
    const [h, p, signature] = token.split('.');
    if (!h || !p || !signature) return null;
    const data = `${h}.${p}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected)));
    if (signature !== expectedB64) return null;
    try {
        return JSON.parse(atob(p));
    } catch (e) {
        return null;
    }
}

function sha256Hex(str) {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(str)).then(buf => {
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    });
}

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            ...headers
        }
    });
}

function corsPreflight() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}

// -----------------------------
// Auth helpers
// -----------------------------
function getToken(request) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith(TOKEN_PREFIX)) {
        return auth.slice(TOKEN_PREFIX.length);
    }
    return null;
}

async function authenticate(request, env) {
    const token = getToken(request);
    if (!token) return null;
    const payload = await verifyJWT(token, JWT_SECRET(env));
    if (!payload || !payload.userId || !payload.login) return null;
    return payload;
}

async function hashPassphrase(passphrase, login, env) {
    const salt = env.PASSPHRASE_SALT || 'bestvn-default-salt-change-me';
    return sha256Hex(`${salt}:${login}:${passphrase}`);
}

// -----------------------------
// D1 helpers
// -----------------------------
async function getUserByLogin(db, login) {
    const result = await db.prepare('SELECT * FROM users WHERE login = ?').bind(login).first();
    return result || null;
}

async function getData(db, userId, key) {
    return await db.prepare('SELECT * FROM data WHERE user_id = ? AND key = ?').bind(userId, key).first();
}

async function setData(db, userId, key, value, updatedBy) {
    const existing = await getData(db, userId, key);
    const now = new Date().toISOString();
    if (existing) {
        await db.prepare('UPDATE data SET value = ?, updated_at = ?, updated_by = ? WHERE user_id = ? AND key = ?')
            .bind(value, now, updatedBy, userId, key).run();
    } else {
        await db.prepare('INSERT INTO data (user_id, key, value, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)')
            .bind(userId, key, value, now, updatedBy).run();
    }
}

async function logAudit(db, userId, key, oldValue, newValue, changedBy) {
    const now = new Date().toISOString();
    await db.prepare(
        'INSERT INTO audit_log (user_id, key, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(userId, key, oldValue, newValue, changedBy, now).run();
}

// -----------------------------
// Router & handlers
// -----------------------------
const router = new Router();

router.options('*', corsPreflight);

router.post('/auth/login', async (request, env) => {
    const body = await request.json();
    const { login, passphrase } = body || {};

    if (!login || !passphrase) {
        return jsonResponse({ error: 'Login and passphrase required' }, 400);
    }

    const db = env.DB;
    let user = await getUserByLogin(db, login);

    if (!user) {
        // Если пользователя нет — создаём нового. Это упрощает первый вход для двоих.
        const hash = await hashPassphrase(passphrase, login, env);
        const result = await db.prepare('INSERT INTO users (login, passphrase_hash) VALUES (?, ?)')
            .bind(login, hash).run();
        user = { id: result.meta.last_row_id, login, passphrase_hash: hash };
    } else {
        const hash = await hashPassphrase(passphrase, login, env);
        if (hash !== user.passphrase_hash) {
            return jsonResponse({ error: 'Invalid passphrase' }, 401);
        }
    }

    const token = await signJWT({ userId: user.id, login: user.login }, JWT_SECRET(env));
    return jsonResponse({ token, login: user.login, userId: user.id });
});

router.get('/auth/me', async (request, env) => {
    const user = await authenticate(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    return jsonResponse({ user });
});

router.get('/data/:key', async (request, env, params) => {
    const user = await authenticate(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const key = params.key;
    const record = await getData(env.DB, user.userId, key);
    if (!record) {
        return jsonResponse({ key, value: null, updated_at: null });
    }
    let parsed;
    try {
        parsed = JSON.parse(record.value);
    } catch (e) {
        parsed = record.value;
    }
    return jsonResponse({
        key,
        value: parsed,
        updated_at: record.updated_at,
        updated_by: record.updated_by
    });
});

router.put('/data/:key', async (request, env, params) => {
    const user = await authenticate(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const key = params.key;
    const body = await request.json();
    const value = JSON.stringify(body.value);

    const existing = await getData(env.DB, user.userId, key);
    const oldValue = existing ? existing.value : null;

    await setData(env.DB, user.userId, key, value, user.login);
    await logAudit(env.DB, user.userId, key, oldValue, value, user.login);

    return jsonResponse({ success: true, key, updated_at: new Date().toISOString() });
});

router.get('/audit', async (request, env) => {
    const user = await authenticate(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50'), 200);
    const logs = await env.DB.prepare(
        'SELECT * FROM audit_log WHERE user_id = ? ORDER BY changed_at DESC LIMIT ?'
    ).bind(user.userId, limit).all();

    return jsonResponse({ logs: logs.results || [] });
});

router.get('/health', () => jsonResponse({ ok: true }));

router.get('*', () => jsonResponse({ error: 'Not found' }, 404));

export default {
    async fetch(request, env, ctx) {
        try {
            return await router.handle(request, env, ctx);
        } catch (err) {
            console.error('Worker error:', err);
            return jsonResponse({ error: 'Internal error', message: err.message }, 500);
        }
    }
};
