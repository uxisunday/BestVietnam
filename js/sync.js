// ============================================
// SYNC: загрузка/сохранение данных через Cloudflare Worker
// При неудаче — fallback на localStorage
// ============================================

const DATA_KEYS = {
    settings: 'vietnam_map_settings',
    expenses: 'vietnam_map_expenses',
    budget: 'vietnam_map_budget_rub',
    routes: 'vietnam_map_user_routes',
    cruises: 'vietnam_map_custom_cruises',
    notes: 'vietnam_map_notes',
    orsKey: 'vietnam_map_ors_key'
};

let syncStatus = 'idle'; // idle, syncing, error
let lastSyncError = null;

function getLocalFallback(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function setLocalFallback(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('LocalStorage fallback failed:', e);
    }
}

function updateSyncIndicator(message, isError = false) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    indicator.textContent = message;
    indicator.className = isError ? 'sync-indicator error' : 'sync-indicator';
    indicator.style.opacity = message ? '1' : '0';
}

async function loadFromCloud(key, defaultValue = null) {
    try {
        syncStatus = 'syncing';
        updateSyncIndicator('Загрузка...');
        const data = await apiRequest('GET', `/data/${key}`);
        syncStatus = 'idle';
        lastSyncError = null;
        updateSyncIndicator('Синхронизировано');
        setTimeout(() => updateSyncIndicator(''), 2000);
        return data.value !== null ? data.value : defaultValue;
    } catch (error) {
        syncStatus = 'error';
        lastSyncError = error.message;
        updateSyncIndicator(`Офлайн (${error.message})`, true);
        return defaultValue;
    }
}

async function saveToCloud(key, value) {
    try {
        syncStatus = 'syncing';
        updateSyncIndicator('Сохранение...');
        await apiRequest('PUT', `/data/${key}`, { value });
        syncStatus = 'idle';
        lastSyncError = null;
        updateSyncIndicator('Сохранено');
        setTimeout(() => updateSyncIndicator(''), 2000);
        return true;
    } catch (error) {
        syncStatus = 'error';
        lastSyncError = error.message;
        updateSyncIndicator(`Ошибка сохранения (${error.message})`, true);
        return false;
    }
}

// -----------------------------
// Settings
// -----------------------------
async function getSettings() {
    const cloud = await loadFromCloud('settings');
    if (cloud !== null) return cloud;

    // Fallback: собираем из старых localStorage ключей
    const settings = {};
    try {
        settings.tripStart = localStorage.getItem('vietnam_map_trip_start') || '2026-09-01';
        settings.tripEnd = localStorage.getItem('vietnam_map_trip_end') || '2026-11-30';
        settings.visaDate = localStorage.getItem('vietnam_map_visa_date') || '';
        settings.visaDays = parseInt(localStorage.getItem('vietnam_map_visa_days')) || 90;
        settings.budgetRub = parseFloat(localStorage.getItem('vietnam_map_budget_rub')) || 600000;
        settings.orsKey = localStorage.getItem('vietnam_map_ors_key') || '';
    } catch (e) {
        console.warn('Settings fallback failed:', e);
    }
    return settings;
}

async function saveSettings(settings) {
    // Сохраняем и в облако, и в localStorage как fallback
    setLocalFallback('vietnam_map_settings', JSON.stringify(settings));
    return await saveToCloud('settings', settings);
}

// -----------------------------
// Expenses
// -----------------------------
async function getExpenses() {
    const cloud = await loadFromCloud('expenses');
    if (cloud !== null) return Array.isArray(cloud) ? cloud : [];

    const fallback = getLocalFallback(DATA_KEYS.expenses);
    return fallback ? JSON.parse(fallback) : [];
}

async function saveExpenses(expenses) {
    setLocalFallback(DATA_KEYS.expenses, JSON.stringify(expenses));
    return await saveToCloud('expenses', expenses);
}

// -----------------------------
// Budget (теперь часть settings, но для совместимости — отдельно)
// -----------------------------
async function getBudget() {
    const settings = await getSettings();
    return settings?.budgetRub || 600000;
}

async function setBudget(amount) {
    const settings = await getSettings();
    settings.budgetRub = amount;
    return await saveSettings(settings);
}

// -----------------------------
// Routes
// -----------------------------
async function getUserRoutes() {
    const cloud = await loadFromCloud('routes');
    if (cloud !== null) return Array.isArray(cloud) ? cloud : [];

    const fallback = getLocalFallback(DATA_KEYS.routes);
    return fallback ? JSON.parse(fallback) : [];
}

async function saveUserRoutes(routes) {
    setLocalFallback(DATA_KEYS.routes, JSON.stringify(routes));
    return await saveToCloud('routes', routes);
}

// -----------------------------
// Custom cruises
// -----------------------------
async function getCustomCruises() {
    const cloud = await loadFromCloud('cruises');
    if (cloud !== null) return Array.isArray(cloud) ? cloud : [];

    const fallback = getLocalFallback(DATA_KEYS.cruises);
    return fallback ? JSON.parse(fallback) : [];
}

async function saveCustomCruises(cruises) {
    setLocalFallback(DATA_KEYS.cruises, JSON.stringify(cruises));
    return await saveToCloud('cruises', cruises);
}

// -----------------------------
// Notes
// -----------------------------
async function getNotes() {
    const cloud = await loadFromCloud('notes');
    if (cloud !== null) return typeof cloud === 'object' ? cloud : {};

    const fallback = getLocalFallback(DATA_KEYS.notes);
    return fallback ? JSON.parse(fallback) : {};
}

async function saveNotes(notes) {
    setLocalFallback(DATA_KEYS.notes, JSON.stringify(notes));
    return await saveToCloud('notes', notes);
}

// -----------------------------
// Migration: при первом входе отправить локальные данные в облако
// -----------------------------
async function migrateLocalDataToCloud() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        // Проверяем, есть ли уже данные в облаке
        const cloudSettings = await apiRequest('GET', '/data/settings');
        if (cloudSettings.value !== null) return; // Уже есть — не затираем
    } catch (e) {
        // Нет связи — пропускаем
        return;
    }

    // Мигрируем settings
    const settings = await getSettings();
    await saveToCloud('settings', settings);

    // Мигрируем expenses
    const expenses = JSON.parse(getLocalFallback(DATA_KEYS.expenses) || '[]');
    if (expenses.length > 0) await saveToCloud('expenses', expenses);

    // Мигрируем routes
    const routes = JSON.parse(getLocalFallback(DATA_KEYS.routes) || '[]');
    if (routes.length > 0) await saveToCloud('routes', routes);

    // Мигрируем cruises
    const cruises = JSON.parse(getLocalFallback(DATA_KEYS.cruises) || '[]');
    if (cruises.length > 0) await saveToCloud('cruises', cruises);

    // Мигрируем notes
    const notes = JSON.parse(getLocalFallback(DATA_KEYS.notes) || '{}');
    if (Object.keys(notes).length > 0) await saveToCloud('notes', notes);

    console.log('Migration to cloud completed');
}

// Глобальные функции
window.getSettings = getSettings;
window.saveSettings = saveSettings;
window.getExpenses = getExpenses;
window.saveExpenses = saveExpenses;
window.getBudget = getBudget;
window.setBudget = setBudget;
window.getUserRoutes = getUserRoutes;
window.saveUserRoutes = saveUserRoutes;
window.getCustomCruises = getCustomCruises;
window.saveCustomCruises = saveCustomCruises;
window.getNotes = getNotes;
window.saveNotes = saveNotes;
window.migrateLocalDataToCloud = migrateLocalDataToCloud;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
