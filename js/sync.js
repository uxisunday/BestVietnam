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
    notesCategories: 'vietnam_map_notes_categories',
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
function parseLocalArray(key) {
    const fallback = getLocalFallback(key);
    if (!fallback) return null;
    try {
        const parsed = JSON.parse(fallback);
        return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
        return null;
    }
}

async function getExpenses() {
    const cloud = await loadFromCloud('expenses');
    const local = parseLocalArray(DATA_KEYS.expenses);

    // Облако — основной источник, НО пустой массив в облаке не должен затирать
    // локальные записи: траты могли быть добавлены офлайн или не доехать до облака.
    // Пустое облако + данные локально = локальное — истина, дотягиваем его в облако.
    if (Array.isArray(cloud) && cloud.length > 0) return cloud;

    if (local && local.length > 0) {
        saveToCloud('expenses', local); // fire-and-forget: если облако снова пусто, дольём
        return local;
    }
    if (local) return local;
    return Array.isArray(cloud) ? cloud : [];
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
// Notes (массив объектов: {id, title, body, category, subcategory, tags, city, address, coords, ...})
// -----------------------------
async function getNotes() {
    const cloud = await loadFromCloud('notes');
    if (Array.isArray(cloud)) return cloud;
    if (cloud && typeof cloud === 'object') {
        // миграция со старого формата {itemId: text} — пропускаем, возвращаем пустой массив
        return [];
    }

    const fallback = getLocalFallback(DATA_KEYS.notes);
    if (!fallback) return [];
    try {
        const parsed = JSON.parse(fallback);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

async function saveNotes(notes) {
    const data = Array.isArray(notes) ? notes : [];
    setLocalFallback(DATA_KEYS.notes, JSON.stringify(data));
    return await saveToCloud('notes', data);
}

// -----------------------------
// Notes categories (пользовательские категории и подкатегории)
// -----------------------------
async function getNoteCategories() {
    const cloud = await loadFromCloud('notesCategories');
    if (cloud && typeof cloud === 'object') return cloud;

    const fallback = getLocalFallback(DATA_KEYS.notesCategories);
    if (fallback) {
        try {
            const parsed = JSON.parse(fallback);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) { /* ignore */ }
    }
    return { categories: [], subcategories: [] };
}

async function saveNoteCategories(cats) {
    const data = cats && typeof cats === 'object'
        ? cats
        : { categories: [], subcategories: [] };
    setLocalFallback(DATA_KEYS.notesCategories, JSON.stringify(data));
    return await saveToCloud('notesCategories', data);
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

    // Мигрируем notes (только если это уже массив; старый формат {itemId: text} не мигрируем)
    try {
        const notesRaw = JSON.parse(getLocalFallback(DATA_KEYS.notes) || '[]');
        if (Array.isArray(notesRaw) && notesRaw.length > 0) {
            await saveToCloud('notes', notesRaw);
        }
    } catch (e) { /* ignore */ }

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
window.getNoteCategories = getNoteCategories;
window.saveNoteCategories = saveNoteCategories;
window.migrateLocalDataToCloud = migrateLocalDataToCloud;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
