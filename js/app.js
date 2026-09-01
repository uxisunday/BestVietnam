// ============================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

// Кэш всех данных, загруженных из облака
window.appData = {
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
            if (!tabId) return; // «Ещё» и прочие кнопки без вкладки обрабатываются отдельно
            switchTab(tabId);

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    initNavMoreSheet();
}

// Мобильная навигация: нижняя панель + шит «Ещё» (погода / планнер / настройки)
function initNavMoreSheet() {
    const trigger = document.getElementById('nav-more-trigger');
    const sheet = document.getElementById('nav-more-sheet');
    if (!trigger || !sheet) return;

    const closeSheet = () => {
        sheet.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
    };
    window.closeNavMoreSheet = closeSheet;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !sheet.classList.contains('hidden');
        sheet.classList.toggle('hidden', isOpen);
        trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    sheet.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item')) closeSheet();
    });

    document.addEventListener('click', (e) => {
        if (sheet.classList.contains('hidden')) return;
        if (e.target.closest('#nav-more-sheet') || e.target.closest('#nav-more-trigger')) return;
        closeSheet();
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

    // На мобильных: если активная вкладка лежит в шите «Ещё» — подсвечиваем триггер
    const moreTrigger = document.getElementById('nav-more-trigger');
    if (moreTrigger) {
        const inSheet = targetNav && targetNav.closest('#nav-more-sheet') && !targetNav.offsetParent;
        moreTrigger.classList.toggle('nav-more-active', Boolean(inSheet));
    }

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
    renderDashboardCalendar();
    setupCalendarNav();
    loadCurrencyRates();
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
            renderDashboardCalendar();
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
        day: '2-digit',
        month: '2-digit'
    }).format(now);
}

// ============================================
// КАЛЕНДАРЬ ДАШБОРДА
// ============================================

let calendarOffset = 0; // 0 — текущий месяц
const CAL_WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const CAL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function renderDashboardCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-month-title');
    if (!grid) return;

    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
    if (title) title.textContent = `${CAL_MONTHS[base.getMonth()]} ${base.getFullYear()}`;

    const firstDow = (base.getDay() + 6) % 7; // понедельник = 0
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

    // период поездки — из полей «Старт/Финиш» на дашборде
    const startStr = document.getElementById('trip-start')?.value;
    const endStr = document.getElementById('trip-end')?.value;
    const tripStart = startStr ? new Date(startStr + 'T00:00:00') : null;
    const tripEnd = endStr ? new Date(endStr + 'T00:00:00') : null;

    let html = CAL_WEEKDAYS.map(w => `<span class="cal-weekday">${w}</span>`).join('');
    const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDow + 1;
        const cellDate = new Date(base.getFullYear(), base.getMonth(), dayNum);
        let cls = 'cal-day';
        if (dayNum < 1 || dayNum > daysInMonth) cls += ' cal-other';

        if (tripStart && tripEnd && cellDate >= tripStart && cellDate <= tripEnd) {
            cls += ' cal-trip';
            const t = cellDate.getTime();
            if (t === tripStart.getTime()) cls += ' cal-first';
            if (t === tripEnd.getTime()) cls += ' cal-last';
        }
        if (calendarOffset === 0 && cellDate.toDateString() === today.toDateString()) {
            cls += ' cal-today';
        }
        html += `<span class="${cls}">${cellDate.getDate()}</span>`;
    }
    grid.innerHTML = html;
}

function setupCalendarNav() {
    const prev = document.getElementById('calendar-prev');
    const next = document.getElementById('calendar-next');
    if (prev) prev.addEventListener('click', () => { calendarOffset--; renderDashboardCalendar(); });
    if (next) next.addEventListener('click', () => { calendarOffset++; renderDashboardCalendar(); });
}

// ============================================
// КУРСЫ ВАЛЮТ (USD, RUB, VND) — обновление раз в сутки
// ============================================

const RATES_API_URL = 'https://open.er-api.com/v6/latest/USD'; // бесплатно, без ключа
const RATES_CACHE_KEY = 'bestvn_rates_cache';

async function loadCurrencyRates() {
    const rowsEl = document.getElementById('rates-rows');
    const updEl = document.getElementById('rates-updated');
    if (!rowsEl) return;

    const today = new Date().toISOString().slice(0, 10);
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(RATES_CACHE_KEY)); } catch (e) { /* битый кэш — игнорируем */ }

    // кэш живёт сутки: если сегодня уже получали — просто рисуем
    if (cache && cache.date === today && cache.usdRub && cache.usdVnd) {
        renderRatesCard(cache);
        return;
    }
    try {
        const res = await fetch(RATES_API_URL);
        const data = await res.json();
        if (data && data.rates && data.rates.RUB && data.rates.VND) {
            const rec = { date: today, usdRub: data.rates.RUB, usdVnd: data.rates.VND };
            try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rec)); } catch (e) { /* приватный режим */ }
            renderRatesCard(rec);
        } else if (cache) {
            renderRatesCard(cache);
        }
    } catch (e) {
        console.warn('Не удалось загрузить курсы валют:', e.message);
        if (cache) renderRatesCard(cache); // показываем хотя бы вчерашний курс
        else rowsEl.innerHTML = '<div class="rate-row"><small>Курсы временно недоступны</small></div>';
    }
}

function renderRatesCard(rec) {
    const rowsEl = document.getElementById('rates-rows');
    const updEl = document.getElementById('rates-updated');
    if (!rowsEl || !rec.usdRub || !rec.usdVnd) return;

    const rubPerVnd10k = (10000 * rec.usdRub / rec.usdVnd).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
    const vndPerRub = (rec.usdVnd / rec.usdRub).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

    rowsEl.innerHTML = `
        <div class="rate-row">
            <span class="rate-pair">💵 1 $</span>
            <span class="rate-value">${rec.usdRub.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽</span>
        </div>
        <div class="rate-row">
            <span class="rate-pair">💵 1 $</span>
            <span class="rate-value">${Math.round(rec.usdVnd).toLocaleString('ru-RU')} ₫</span>
        </div>
        <div class="rate-row">
            <span class="rate-pair">🏦 10 000 ₫</span>
            <span class="rate-value">≈ ${rubPerVnd10k} ₽</span>
        </div>
        <div class="rate-row">
            <span class="rate-pair">🇻🇳 1 ₽</span>
            <span class="rate-value">${vndPerRub} ₫</span>
        </div>`;

    const d = new Date(rec.date + 'T00:00:00');
    if (updEl) updEl.textContent = `Обновлено ${d.toLocaleDateString('ru-RU')} · курс обновляется раз в сутки`;
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
