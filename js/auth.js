// ============================================
// AUTH: логин + ключевое слово, JWT-токен
// ============================================

const API_URL = 'https://bestvi.bestvietnam-sync-morning.workers.dev'; // ЗАМЕНИТЬ ПРИ ДЕПЛОЕ
const TOKEN_KEY = 'bestvn_token';
const LOGIN_KEY = 'bestvn_login';

let currentUser = null;

function getApiUrl() {
    return API_URL;
}

function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function apiRequest(method, path, body = null) {
    const options = {
        method,
        headers: getAuthHeaders()
    };
    if (body !== null) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`${getApiUrl()}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
}

async function login(login, passphrase) {
    const data = await apiRequest('POST', '/auth/login', { login, passphrase });
    if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(LOGIN_KEY, data.login);
        currentUser = { userId: data.userId, login: data.login };
        return currentUser;
    }
    throw new Error('Login failed: no token');
}

async function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
        const data = await apiRequest('GET', '/auth/me');
        currentUser = data.user;
        return currentUser;
    } catch (error) {
        console.warn('Auth check failed:', error.message);
        logout();
        return null;
    }
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LOGIN_KEY);
    currentUser = null;
    showLoginScreen();
}

function showLoginScreen(errorMessage = '') {
    const app = document.querySelector('.app');
    const loginScreen = document.getElementById('login-screen');
    if (app) app.style.display = 'none';
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = errorMessage;
            errorEl.style.display = errorMessage ? 'block' : 'none';
        }
    }
}

function showMainApp() {
    const app = document.querySelector('.app');
    const loginScreen = document.getElementById('login-screen');
    if (app) app.style.display = 'flex';
    if (loginScreen) loginScreen.classList.add('hidden');
}

function initAuth() {
    const form = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginInput = document.getElementById('login-input');
            const passphraseInput = document.getElementById('passphrase-input');
            const submitBtn = form.querySelector('button[type="submit"]');

            if (submitBtn) submitBtn.disabled = true;
            try {
                await login(loginInput.value.trim(), passphraseInput.value);
                passphraseInput.value = '';
                showMainApp();
                // Запускаем инициализацию приложения после входа
                if (typeof initAppAfterAuth === 'function') {
                    await initAppAfterAuth();
                }
            } catch (error) {
                showLoginScreen(error.message);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // При загрузке проверяем сессию
    checkAuth().then(user => {
        if (user) {
            showMainApp();
            if (typeof initAppAfterAuth === 'function') {
                initAppAfterAuth();
            }
        } else {
            showLoginScreen();
        }
    });
}

// Глобальные функции
window.login = login;
window.logout = logout;
window.checkAuth = checkAuth;
window.getApiUrl = getApiUrl;
window.apiRequest = apiRequest;
window.getAuthHeaders = getAuthHeaders;
