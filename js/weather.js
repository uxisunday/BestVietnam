// ============================================
// ПОГОДА: Open-Meteo API (бесплатно, без ключа)
// ============================================

const WEATHER_CACHE = {};
const WEATHER_CODES = {
    0: { icon: '☀️', desc: 'Ясно' },
    1: { icon: '🌤️', desc: 'Преимущественно ясно' },
    2: { icon: '⛅', desc: 'Переменная облачность' },
    3: { icon: '☁️', desc: 'Пасмурно' },
    45: { icon: '🌫️', desc: 'Туман' },
    48: { icon: '🌫️', desc: 'Отложение инея' },
    51: { icon: '🌦️', desc: 'Морось' },
    53: { icon: '🌦️', desc: 'Умеренная морось' },
    55: { icon: '🌧️', desc: 'Сильная морось' },
    61: { icon: '🌧️', desc: 'Небольшой дождь' },
    63: { icon: '🌧️', desc: 'Дождь' },
    65: { icon: '🌧️', desc: 'Сильный дождь' },
    71: { icon: '🌨️', desc: 'Небольшой снег' },
    73: { icon: '🌨️', desc: 'Снег' },
    75: { icon: '❄️', desc: 'Сильный снег' },
    80: { icon: '🌦️', desc: 'Ливень' },
    81: { icon: '🌧️', desc: 'Сильный ливень' },
    82: { icon: '⛈️', desc: 'Сильный ливень' },
    95: { icon: '⛈️', desc: 'Гроза' },
    96: { icon: '⛈️', desc: 'Гроза с градом' },
    99: { icon: '⛈️', desc: 'Сильная гроза с градом' }
};

function getWeatherCode(code) {
    return WEATHER_CODES[code] || { icon: '🌡️', desc: 'Неизвестно' };
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('ru-RU', options);
}

function initWeather() {
    renderWeatherList();

    const searchInput = document.getElementById('weather-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterWeatherList(e.target.value);
        });
    }
}

function getAllWeatherItems() {
    return [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.attractions
    ];
}

function renderWeatherList() {
    const list = document.getElementById('weather-list');
    if (!list) return;

    const items = getAllWeatherItems();
    list.innerHTML = items.map(item => `
        <div class="weather-list-item" data-id="${item.id}" onclick="selectWeatherItem('${item.id}')">
            <div class="weather-city">${item.name} <span style="color: var(--text-secondary); font-size: 12px;">(${item.nameViet})</span></div>
            <div class="weather-temp" id="temp-${item.id}">Загрузка...</div>
        </div>
    `).join('');

    // Загружаем температуру для всех городов в списке
    items.forEach(item => loadCurrentTemp(item));
}

function filterWeatherList(query) {
    const items = document.querySelectorAll('.weather-list-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(el => {
        const id = el.dataset.id;
        const item = findItemById(id);
        if (!item) return;

        const match = item.name.toLowerCase().includes(lowerQuery) ||
                      item.nameViet.toLowerCase().includes(lowerQuery);
        el.style.display = match ? 'block' : 'none';
    });
}

async function loadCurrentTemp(item) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${item.coords[0]}&longitude=${item.coords[1]}&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.current) {
            const code = getWeatherCode(data.current.weather_code);
            const tempEl = document.getElementById(`temp-${item.id}`);
            if (tempEl) {
                tempEl.innerHTML = `${code.icon} ${Math.round(data.current.temperature_2m)}°C`;
            }
        }
    } catch (error) {
        console.error('Weather temp load error:', error);
        const tempEl = document.getElementById(`temp-${item.id}`);
        if (tempEl) tempEl.textContent = '—';
    }
}

async function selectWeatherItem(itemId) {
    const item = findItemById(itemId);
    if (!item) return;

    // Подсветить активный элемент
    document.querySelectorAll('.weather-list-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.weather-list-item[data-id="${itemId}"]`);
    if (activeEl) activeEl.classList.add('active');

    const detail = document.getElementById('weather-detail');
    if (!detail) return;

    detail.innerHTML = `
        <div class="loading-state">
            <span class="empty-icon">🌤️</span>
            <p>Загрузка прогноза для ${item.name}...</p>
        </div>
    `;

    try {
        const forecast = await loadForecast(item.coords);
        renderWeatherDetail(item, forecast);
    } catch (error) {
        console.error('Forecast error:', error);
        detail.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⚠️</span>
                <p>Не удалось загрузить погоду. Проверьте интернет-соединение.</p>
            </div>
        `;
    }
}

async function loadForecast(coords) {
    const cacheKey = `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`;
    if (WEATHER_CACHE[cacheKey]) return WEATHER_CACHE[cacheKey];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const response = await fetch(url);
    const data = await response.json();
    WEATHER_CACHE[cacheKey] = data;
    return data;
}

function renderWeatherDetail(item, data) {
    const detail = document.getElementById('weather-detail');
    if (!detail) return;

    const current = data.current;
    const currentCode = getWeatherCode(current.weather_code);
    const daily = data.daily;

    let forecastHtml = '';
    for (let i = 0; i < daily.time.length; i++) {
        const code = getWeatherCode(daily.weather_code[i]);
        forecastHtml += `
            <div class="forecast-day">
                <div class="day">${formatDate(daily.time[i])}</div>
                <div class="icon">${code.icon}</div>
                <div class="temp">${Math.round(daily.temperature_2m_max[i])}°</div>
                <div class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${daily.precipitation_sum[i] > 0 ? '🌧️ ' + daily.precipitation_sum[i] + ' мм' : ''}</div>
            </div>
        `;
    }

    detail.innerHTML = `
        <div class="weather-detail-header">
            <div>
                <h2>${item.name} <span style="color: var(--text-secondary); font-size: 16px;">(${item.nameViet})</span></h2>
                <div class="weather-desc">${currentCode.desc} • Влажность ${current.relative_humidity_2m}% • Ветер ${current.wind_speed_10m} км/ч</div>
            </div>
            <div class="weather-main">${currentCode.icon} ${Math.round(current.temperature_2m)}°C</div>
        </div>

        <h3 style="margin-bottom: 16px;">Прогноз на 7 дней</h3>
        <div class="forecast-grid">
            ${forecastHtml}
        </div>

        <div style="margin-top: 24px; padding: 16px; background: var(--bg-secondary); border-radius: var(--radius);">
            <strong style="color: var(--accent);">Совет по сезону:</strong>
            <p style="margin-top: 8px; color: var(--text-secondary);">${getSeasonAdvice(item.region)}</p>
        </div>
    `;
}

function getSeasonAdvice(region) {
    const now = new Date();
    const month = now.getMonth() + 1;

    if (month >= 9 && month <= 11) {
        switch (region) {
            case 'north':
                return 'Осень — лучшее время для севера: сухо, тепло, ясное небо. Идеально для Ханоя, Халонга и Сапы.';
            case 'central':
                return 'Центр Вьетнама осенью в пике дождливого сезона и тайфунов. Дананг и Хойан могут затопить.';
            case 'central_coast':
                return 'Нячанг в сентябре ещё терпим, но в октябре–ноябре дожди и шторма усиливаются.';
            case 'south':
                return 'Юг в ноябре входит в высокий сезон. Фукуок и Муйне — отличный выбор.';
            case 'highlands':
                return 'Горный Далат осенью прохладный и зелёный, дожди умеренные.';
            default:
                return 'Осень — период смены муссонов. Север и юг обычно комфортнее центра.';
        }
    }

    return 'Погодные условия зависят от региона. Север и юг осенью обычно комфортнее центрального побережья.';
}
