// ============================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

// Кэш всех данных, загруженных из облака
window.window.appData = {
    settings: null,
    expenses: null,
    routes: null,
    cruises: null,
    notes: null
};

async function loadAllData() {
    updateSyncIndicator('Загрузка данных...');
    const [settings, expenses, routes, cruises, notes, notesCategories] = await Promise.all([
        getSettings(),
        getExpenses(),
        getUserRoutes(),
        getCustomCruises(),
        getNotes(),
        getNoteCategories()
    ]);

    window.appData = { settings, expenses, routes, cruises, notes, notesCategories };
    updateSyncIndicator('Синхронизировано');
    setTimeout(() => updateSyncIndicator(''), 2000);
    return window.appData;
}

// Инициализация приложения после успешной авторизации
async function initAppAfterAuth() {
    await migrateLocalDataToCloud();
    await loadAllData();

    initTabs();
    initMap();
    initWeather();
    await initNotes();
    if (typeof window.renderUserNoteMarkers === 'function') {
        await window.renderUserNoteMarkers(window.appData.notes || []);
    }
    await initRoutes();
    await initExpenses();
    await initDashboard();
    await initPlanner();
    await renderUserRoutesOnMap();
}

// Переключение вкладок
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            switchTab(tabId);

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchTab(tabId) {
    // Убираем активность со всех вкладок
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    // Активируем нужную вкладку
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Если переключаемся на карту — обновляем размер
    if (tabId === 'map' && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
}

// ============================================
// ДАШБОРД: даты поездки, виза, время
// ============================================

const TRIP_START_KEY = 'vietnam_map_trip_start';
const TRIP_END_KEY = 'vietnam_map_trip_end';
const VISA_DATE_KEY = 'vietnam_map_visa_date';
const VISA_DAYS_KEY = 'vietnam_map_visa_days';

let cachedSettings = null;

const DEFAULT_TRIP_START = '2026-09-01';
const DEFAULT_TRIP_END = '2026-11-30';
const DEFAULT_VISA_DAYS = 90;

async function initDashboard() {
    cachedSettings = window.appData.settings;
    setupTripInputs();
    setupVisaInputs();
    updateTripCard();
    updateVisaCard();
    startClocks();
}

function setupTripInputs() {
    const startInput = document.getElementById('trip-start');
    const endInput = document.getElementById('trip-end');
    if (!startInput || !endInput) return;

    startInput.value = cachedSettings?.tripStart || DEFAULT_TRIP_START;
    endInput.value = cachedSettings?.tripEnd || DEFAULT_TRIP_END;

    const save = async () => {
        const start = startInput.value;
        const end = endInput.value;
        if (start && end && start <= end) {
            cachedSettings = cachedSettings || {};
            cachedSettings.tripStart = start;
            cachedSettings.tripEnd = end;
            await saveSettings(cachedSettings);
            updateTripCard();
        }
    };

    startInput.addEventListener('change', save);
    endInput.addEventListener('change', save);
}

function setupVisaInputs() {
    const dateInput = document.getElementById('visa-date');
    const daysInput = document.getElementById('visa-days');
    if (!dateInput || !daysInput) return;

    dateInput.value = cachedSettings?.visaDate || '';
    daysInput.value = cachedSettings?.visaDays || DEFAULT_VISA_DAYS;

    const save = async () => {
        cachedSettings = cachedSettings || {};
        cachedSettings.visaDate = dateInput.value;
        cachedSettings.visaDays = daysInput.value;
        await saveSettings(cachedSettings);
        updateVisaCard();
    };

    dateInput.addEventListener('change', save);
    daysInput.addEventListener('input', save);
}

function updateTripCard() {
    const startInput = document.getElementById('trip-start');
    const endInput = document.getElementById('trip-end');
    const daysEl = document.getElementById('trip-days');
    const toStartEl = document.getElementById('trip-to-start');
    if (!startInput || !endInput || !daysEl) return;

    const start = new Date(startInput.value);
    const end = new Date(endInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = end - start;
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    daysEl.textContent = days;

    const daysUnitEl = daysEl.nextElementSibling;
    if (daysUnitEl && daysUnitEl.classList.contains('metric-unit')) {
        daysUnitEl.textContent = declineDays(days);
    }

    const toStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    if (toStartEl) {
        if (toStart > 0) {
            toStartEl.textContent = `До старта: ${toStart} ${declineDays(toStart)}`;
        } else if (toStart <= 0 && toStart + days > 0) {
            const dayNum = Math.abs(toStart) + 1;
            toStartEl.textContent = `Поездка идёт, день ${dayNum}`;
        } else {
            toStartEl.textContent = 'Поездка завершена';
        }
    }
}

function updateVisaCard() {
    const dateInput = document.getElementById('visa-date');
    const daysInput = document.getElementById('visa-days');
    const remainingEl = document.getElementById('visa-remaining');
    const endDateEl = document.getElementById('visa-end-date');
    if (!dateInput || !daysInput || !remainingEl) return;

    const issueDateStr = dateInput.value;
    const duration = parseInt(daysInput.value) || 0;

    if (!issueDateStr || duration <= 0) {
        remainingEl.textContent = '—';
        if (endDateEl) endDateEl.textContent = 'Укажите дату оформления визы';
        return;
    }

    const issueDate = new Date(issueDateStr);
    const endDate = new Date(issueDate);
    endDate.setDate(endDate.getDate() + duration);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const remaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    const remValue = remaining >= 0 ? remaining : 0;
    remainingEl.textContent = remValue;

    const unitEl = remainingEl.nextElementSibling;
    if (unitEl && unitEl.classList.contains('metric-unit')) {
        unitEl.textContent = declineDaysRemaining(remValue);
    }

    if (endDateEl) {
        endDateEl.textContent = `Действует до ${endDate.toLocaleDateString('ru-RU')}`;
    }

    remainingEl.classList.remove('danger');
    if (remaining <= 7 && remaining >= 0) remainingEl.classList.add('danger');
}

function startClocks() {
    function update() {
        const now = new Date();
        updateTimeWidget('time-vietnam', 'date-vietnam', 'Asia/Ho_Chi_Minh', now);
        updateTimeWidget('time-moscow', 'date-moscow', 'Europe/Moscow', now);
    }

    update();
    setInterval(update, 1000);
}

function updateTimeWidget(timeId, dateId, timeZone, now) {
    const timeEl = document.getElementById(timeId);
    const dateEl = document.getElementById(dateId);
    if (!timeEl || !dateEl) return;

    timeEl.textContent = new Intl.DateTimeFormat('ru-RU', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(now);

    dateEl.textContent = new Intl.DateTimeFormat('ru-RU', {
        timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'long'
    }).format(now);
}

function declineDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'день';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'дня';
    return 'дней';
}

function declineDaysRemaining(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    let unit;
    if (mod10 === 1 && mod100 !== 11) unit = 'день';
    else if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) unit = 'дня';
    else unit = 'дней';
    return `${unit} осталось`;
}

// ============================================
// ПЛАННЕР
// ============================================

async function initPlanner() {
    await renderPlanner();
    await updateDashboardPlannerBanner();
}

async function renderPlanner() {
    const remindersEl = document.getElementById('planner-reminders');
    const listEl = document.getElementById('planner-list');
    if (!listEl) return;

    const userRoutes = await getUserRoutes();
    const routes = (Array.isArray(userRoutes) ? userRoutes : [])
        .filter(r => r.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (routes.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state-small">
                <p>Пока нет запланированных маршрутов с датами. Создайте маршрут на карте и укажите дату.</p>
            </div>
        `;
        if (remindersEl) {
            remindersEl.innerHTML = `
                <div class="empty-state-small">
                    <p>Запланируйте маршрут с датой, чтобы увидеть напоминания.</p>
                </div>
            `;
        }
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ближайшие события (сегодня + 7 дней)
    const upcoming = routes.filter(r => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
    });

    if (remindersEl) {
        if (upcoming.length === 0) {
            const next = routes[0];
            const d = new Date(next.date);
            d.setHours(0, 0, 0, 0);
            const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            remindersEl.innerHTML = `
                <div class="planner-reminder calm">
                    <div class="reminder-title">Следующее событие</div>
                    <div class="reminder-body">${diff >= 0 ? `Через ${diff} ${declineDays(diff)}: ${next.name}` : next.name}</div>
                </div>
            `;
        } else {
            remindersEl.innerHTML = upcoming.map(r => {
                const d = new Date(r.date);
                d.setHours(0, 0, 0, 0);
                const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                const label = diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : `Через ${diff} ${declineDays(diff)}`;
                return `
                    <div class="planner-reminder ${diff <= 2 ? 'urgent' : ''}">
                        <div class="reminder-title">${label}</div>
                        <div class="reminder-body">${r.name}</div>
                    </div>
                `;
            }).join('');
        }
    }

    listEl.innerHTML = routes.map(r => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        const statusClass = diff < 0 ? 'past' : diff === 0 ? 'today' : diff <= 2 ? 'soon' : 'future';
        const statusLabel = diff < 0 ? 'Прошло' : diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : `Через ${diff} ${declineDays(diff)}`;
        const distance = r.distance ? `${(r.distance / 1000).toFixed(1)} км` : '';
        const duration = r.duration ? formatDurationForPlanner(r.duration) : '';

        return `
            <div class="planner-item ${statusClass}">
                <div class="planner-item-date">
                    <div class="planner-day">${d.getDate()}</div>
                    <div class="planner-month">${d.toLocaleDateString('ru-RU', { month: 'short' })}</div>
                </div>
                <div class="planner-item-body">
                    <div class="planner-item-status">${statusLabel}</div>
                    <h4 class="planner-item-title">${r.name}</h4>
                    <p class="planner-item-route">${(r.waypoints || []).map(w => w.name.split(' (')[0]).join(' → ')}</p>
                    ${distance || duration ? `<p class="planner-item-meta">${distance ? '🛣️ ' + distance : ''}${distance && duration ? ' • ' : ''}${duration ? '⏱️ ' + duration : ''}</p>` : ''}
                </div>
                <div class="planner-item-actions">
                    <button class="btn btn-secondary" onclick="highlightRouteOnMap('${r.id}')">🗺️</button>
                    <button class="btn btn-secondary" onclick="editUserRoute('${r.id}')">✏️</button>
                </div>
            </div>
        `;
    }).join('');
}

function formatDurationForPlanner(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m} мин`;
    return `${h} ч ${m} мин`;
}

async function updateDashboardPlannerBanner() {
    const container = document.getElementById('dashboard-planner-banner');
    if (!container) return;

    const userRoutes = await getUserRoutes();
    const routes = (Array.isArray(userRoutes) ? userRoutes : [])
        .filter(r => r.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (routes.length === 0) {
        container.innerHTML = '';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = routes.filter(r => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        return diff >= 0;
    });

    if (upcoming.length === 0) {
        container.innerHTML = '';
        return;
    }

    const next = upcoming[0];
    const d = new Date(next.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    const label = diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : `Через ${diff} ${declineDays(diff)}`;

    container.innerHTML = `
        <div class="planner-banner">
            <span class="planner-banner-icon">📅</span>
            <div class="planner-banner-body">
                <div class="planner-banner-label">${label} запланировано</div>
                <div class="planner-banner-title">${next.name}</div>
            </div>
            <button class="btn btn-secondary" onclick="switchTab('planner')">В планнер</button>
        </div>
    `;
}

async function saveORSApiKey() {
    const input = document.getElementById('ors-api-key');
    if (!input) return;
    const key = input.value.trim();
    cachedSettings = await getSettings();
    if (!key) {
        cachedSettings.orsKey = '';
        await saveSettings(cachedSettings);
        updateRouteBuilderStatus();
        alert('Ключ удалён. Будет использоваться бесплатный OSRM.');
    } else {
        cachedSettings.orsKey = key;
        await saveSettings(cachedSettings);
        updateRouteBuilderStatus();
        alert('Ключ OpenRouteService сохранён. ORS теперь приоритетный маршрутизатор.');
    }
}

// Глобальные функции, доступные из HTML onclick
window.switchTab = switchTab;
window.showWeatherFor = showWeatherFor;
window.openNoteFor = openNoteFor;
window.selectWeatherItem = selectWeatherItem;
window.addUserRoute = addUserRoute;
window.deleteUserRoute = deleteUserRoute;
window.highlightRouteOnMap = highlightRouteOnMap;
window.showGallery = showGallery;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.editBudget = editBudget;
window.exportExpenses = exportExpenses;
window.importExpenses = importExpenses;
window.clearExpenses = clearExpenses;
window.toggleRouteBuilder = toggleRouteBuilder;
window.removeWaypoint = removeWaypoint;
window.addRouteWaypoint = addRouteWaypoint;
window.editUserRoute = editUserRoute;
window.closeRouteDetail = closeRouteDetail;
window.saveRouteChanges = saveRouteChanges;
window.deleteRoutePhoto = deleteRoutePhoto;
window.handleRoutePhotos = handleRoutePhotos;
window.saveORSApiKey = saveORSApiKey;
window.clearORSKeyAndRebuild = clearORSKeyAndRebuild;
window.renderPlanner = renderPlanner;
window.toggleCruisesSection = toggleCruisesSection;
window.moveCarousel = moveCarousel;
window.openCruiseForm = openCruiseForm;
window.saveCustomCruise = saveCustomCruise;
window.openRouteLightbox = openRouteLightbox;
window.closeRouteLightbox = closeRouteLightbox;
window.initAppAfterAuth = initAppAfterAuth;
window.initAuth = initAuth;
