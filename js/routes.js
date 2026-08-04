// ============================================
// МАРШРУТЫ: предустановленные и пользовательские
// ============================================

const ROUTES_STORAGE_KEY = 'vietnam_map_user_routes';
const CUSTOM_CRUISES_KEY = 'vietnam_map_custom_cruises';

let editingRouteId = null;
let carouselOffset = 0;

function initRoutes() {
    renderCruiseCarousel();
    renderUserRoutes();
    populateRouteSelects();

    const addBtn = document.getElementById('add-route');
    if (addBtn) {
        addBtn.addEventListener('click', addUserRoute);
    }
}

function getUserRoutes() {
    try {
        const saved = localStorage.getItem(ROUTES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Routes load error:', error);
        return [];
    }
}

function saveUserRoutes(routes) {
    try {
        localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
    } catch (error) {
        console.error('Routes save error:', error);
    }
}

function getCustomCruises() {
    try {
        const saved = localStorage.getItem(CUSTOM_CRUISES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Custom cruises load error:', error);
        return [];
    }
}

function saveCustomCruises(cruises) {
    try {
        localStorage.setItem(CUSTOM_CRUISES_KEY, JSON.stringify(cruises));
    } catch (error) {
        console.error('Custom cruises save error:', error);
    }
}

function getRouteTypeLabel(type) {
    const labels = {
        flight: '✈️ Перелёт',
        road: '🚗 Дорога',
        cruise: '⚓ Круиз',
        info: '📋 Морской маршрут (инфо)',
        train: '🚂 Поезд'
    };
    return labels[type] || '📍 Маршрут';
}

function getCruiseImage(route) {
    if (route.image) return route.image;
    // Пытаемся найти фото связанной достопримечательности/города по маршруту
    const relatedIds = [route.from, route.to, route.from?.replace('-port', ''), route.to?.replace('-port', '')];
    const allItems = getAllItems();
    for (const id of relatedIds) {
        if (!id) continue;
        const item = allItems.find(i => i.id === id);
        if (item && item.images && item.images.length > 0) {
            return item.images[0];
        }
    }
    // Фолбэк по типу маршрута
    const fallbackImages = {
        cruise: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=600&q=80',
        info: 'https://images.unsplash.com/photo-1528127220108-6124600f3c7a?w=600&q=80'
    };
    return fallbackImages[route.type] || fallbackImages.info;
}

function getAllItems() {
    return [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];
}

function getGetYourGuideUrl(route) {
    if (route.getyourguide) return route.getyourguide;
    if (route.url) return route.url;

    // Автоматически подбираем по точкам маршрута
    const firstCityId = route.waypoints?.[0]?.id || route.from;
    const cityMap = {
        hanoi: 'hanoi-l205',
        halong: 'ha-long-l2053',
        ninhbinh: 'ninh-binh-l2054',
        sapa: 'sapa-l2060',
        danang: 'da-nang-l2056',
        hoian: 'hoi-an-l2057',
        hue: 'hue-l2058',
        nhatrang: 'nha-trang-l2062',
        hcmc: 'ho-chi-minh-city-l2055',
        muine: 'mui-ne-l13495',
        phuquoc: 'phu-quoc-l13494',
        dalat: 'da-lat-l13496',
        cantho: 'can-tho-l13493'
    };
    const slug = cityMap[firstCityId?.replace('-port', '').replace('-town', '')] || 'vietnam-l1';
    return `https://www.getyourguide.com/ru-ru/${slug}/`;
}

function renderCruiseCarousel() {
    const track = document.getElementById('cruise-carousel');
    if (!track) return;

    const builtIn = VIETNAM_DATA.routes.filter(r => r.type === 'cruise' || r.type === 'info');
    const custom = getCustomCruises();
    const allCruises = [...builtIn, ...custom];

    if (allCruises.length === 0) {
        track.innerHTML = `
            <div class="empty-state-small" style="flex: 1;">
                <p>Пока нет идей для поездок. Добавьте буклет или ссылку.</p>
            </div>
        `;
        return;
    }

    track.innerHTML = allCruises.map(route => {
        const image = getCruiseImage(route);
        const fromItem = findItemById(route.from);
        const toItem = findItemById(route.to);
        const fromName = fromItem ? fromItem.name : route.from;
        const toName = toItem ? toItem.name : route.to;
        const routeLabel = route.from !== route.to ? `${fromName} → ${toName}` : fromName;

        return `
            <div class="carousel-card">
                <img class="carousel-card-image" src="${image}" alt="${escapeHtml(route.name)}">
                <div class="carousel-card-body">
                    <div class="carousel-card-title">${escapeHtml(route.name)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${routeLabel}</div>
                    <p class="carousel-card-desc">${escapeHtml(route.description || '')}</p>
                    <div class="carousel-card-actions">
                        ${route.getyourguide || route.url ? `
                            <a class="btn btn-secondary" style="flex: 1; text-align: center;" href="${escapeHtml(route.getyourguide || route.url)}" target="_blank">🔗 Подробнее</a>
                        ` : ''}
                        <button class="btn btn-secondary" style="flex: 1;" onclick="highlightRouteOnMap('${route.id}')">🗺️ На карте</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function moveCarousel(direction) {
    const track = document.getElementById('cruise-carousel');
    if (!track) return;
    const cardWidth = 336;
    track.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
}

function toggleCruisesSection() {
    const section = document.getElementById('cruises-section');
    if (section) section.classList.toggle('collapsed');
}

function openCruiseForm() {
    const detail = document.getElementById('route-detail');
    if (!detail) return;

    detail.innerHTML = `
        <div class="route-detail-card">
            <div class="route-detail-header">
                <h3 style="margin: 0;">➕ Добавить буклет / идею для поездки</h3>
                <button class="btn btn-secondary" onclick="closeRouteDetail()">Закрыть</button>
            </div>

            <div class="detail-section">
                <label class="section-label">Название маршрута / экскурсии</label>
                <input type="text" id="cruise-name" placeholder="Например: Круиз Халонг 2 дня">
            </div>

            <div class="detail-section">
                <label class="section-label">Краткое описание</label>
                <textarea id="cruise-desc" rows="3" placeholder="Что входит, длительность, стоимость..."></textarea>
            </div>

            <div class="detail-section">
                <label class="section-label">Ссылка на буклет или сайт</label>
                <input type="url" id="cruise-url" placeholder="https://...">
            </div>

            <div class="detail-section">
                <label class="section-label">Ссылка на фото (необязательно)</label>
                <input type="url" id="cruise-image" placeholder="https://images.unsplash.com/...">
            </div>

            <div class="detail-actions">
                <button class="btn btn-primary" onclick="saveCustomCruise()">💾 Сохранить идею</button>
            </div>
        </div>
    `;
}

function saveCustomCruise() {
    const nameInput = document.getElementById('cruise-name');
    const descInput = document.getElementById('cruise-desc');
    const urlInput = document.getElementById('cruise-url');
    const imageInput = document.getElementById('cruise-image');

    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const url = urlInput ? urlInput.value.trim() : '';
    const image = imageInput ? imageInput.value.trim() : '';

    if (!name) {
        alert('Введите название');
        return;
    }

    const cruises = getCustomCruises();
    cruises.push({
        id: 'custom-cruise-' + Date.now(),
        name,
        description,
        url,
        image,
        from: '',
        to: '',
        type: 'info'
    });

    saveCustomCruises(cruises);
    renderCruiseCarousel();
    closeRouteDetail();
    showRouteNotification('🚢 Идея для поездки сохранена');
}

function populateRouteSelects() {
    const fromSelect = document.getElementById('route-from');
    const toSelect = document.getElementById('route-to');
    if (!fromSelect || !toSelect) return;

    const allCities = VIETNAM_DATA.cities;
    const options = allCities.map(city => `
        <option value="${city.id}">${city.name} (${city.nameViet})</option>
    `).join('');

    fromSelect.innerHTML = `<option value="">Откуда</option>${options}`;
    toSelect.innerHTML = `<option value="">Куда</option>${options}`;
}

function addUserRoute() {
    const fromSelect = document.getElementById('route-from');
    const toSelect = document.getElementById('route-to');

    if (!fromSelect.value || !toSelect.value) {
        alert('Выберите оба города');
        return;
    }

    if (fromSelect.value === toSelect.value) {
        alert('Начало и конец маршрута должны различаться');
        return;
    }

    const fromItem = findItemById(fromSelect.value);
    const toItem = findItemById(toSelect.value);

    const newRoute = {
        id: 'user-' + Date.now(),
        name: `${fromItem.name} → ${toItem.name}`,
        date: '',
        description: 'Пользовательский маршрут',
        waypoints: [
            { id: fromItem.id, name: `${fromItem.name} (${fromItem.nameViet})`, coords: fromItem.coords },
            { id: toItem.id, name: `${toItem.name} (${toItem.nameViet})`, coords: toItem.coords }
        ],
        geometry: null,
        distance: 0,
        duration: 0,
        plannedDistance: 0,
        plannedDuration: 0,
        actualDistance: 0,
        actualDuration: 0,
        photos: [],
        notes: ''
    };

    const routes = getUserRoutes();
    routes.push(newRoute);
    saveUserRoutes(routes);
    renderUserRoutes();
    updatePlanner();
    editUserRoute(newRoute.id);

    fromSelect.value = '';
    toSelect.value = '';
}

function deleteUserRoute(routeId) {
    if (!confirm('Удалить этот маршрут?')) return;

    const routes = getUserRoutes().filter(r => r.id !== routeId);
    saveUserRoutes(routes);
    renderUserRoutes();
    closeRouteDetail();
    updatePlanner();
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m} мин`;
    return `${h} ч ${m} мин`;
}

function parseDurationInput(value) {
    if (!value) return 0;
    const parts = value.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 2) {
        return parts[0] * 3600 + parts[1] * 60;
    }
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num * 3600;
}

function durationInputString(seconds) {
    if (!seconds || isNaN(seconds)) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function editUserRoute(routeId) {
    editingRouteId = routeId;
    const route = getUserRoutes().find(r => r.id === routeId);
    if (!route) return;

    const detail = document.getElementById('route-detail');
    if (!detail) return;

    const distanceKm = route.distance ? (route.distance / 1000).toFixed(1) : '—';
    const duration = formatDuration(route.duration);
    const dateVal = route.date || '';
    const plannedDistanceKm = route.plannedDistance ? (route.plannedDistance / 1000).toFixed(1) : '';
    const actualDistanceKm = route.actualDistance ? (route.actualDistance / 1000).toFixed(1) : '';
    const plannedDurationStr = durationInputString(route.plannedDuration);
    const actualDurationStr = durationInputString(route.actualDuration);

    const waypointsHtml = (route.waypoints || []).map((wp, i) => `
        <div class="detail-waypoint">
            <span class="detail-waypoint-num">${i + 1}</span>
            <span class="detail-waypoint-name">${escapeHtml(wp.name)}</span>
        </div>
    `).join('');

    const photosHtml = (route.photos || []).map((photo, i) => `
        <div class="route-photo-thumb">
            <img src="${photo}" alt="Фото ${i + 1}" onclick="openRouteLightbox('${photo}')">
            <button class="btn-icon" onclick="deleteRoutePhoto('${routeId}', ${i})" title="Удалить">✕</button>
        </div>
    `).join('');

    detail.innerHTML = `
        <div class="route-detail-card">
            <div class="route-detail-header">
                <input type="text" id="edit-route-name" value="${escapeHtml(route.name)}" class="detail-title-input">
                <button class="btn btn-danger" onclick="deleteUserRoute('${routeId}')">🗑️ Удалить</button>
            </div>

            <div class="route-detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Дата</span>
                    <input type="date" id="edit-route-date" value="${dateVal}">
                </div>
                <div class="meta-item">
                    <span class="meta-label">Расстояние (по карте)</span>
                    <span class="meta-value">${distanceKm} км</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Время в пути (по карте)</span>
                    <span class="meta-value">${duration}</span>
                </div>
            </div>

            <div class="detail-section">
                <label class="section-label">📊 Запланировано vs факт</label>
                <div class="route-stats-grid">
                    <div class="route-stat-box">
                        <div class="route-stat-label">Расстояние план (км)</div>
                        <input type="number" id="edit-planned-distance" value="${plannedDistanceKm}" step="0.1" placeholder="0">
                    </div>
                    <div class="route-stat-box">
                        <div class="route-stat-label">Расстояние факт (км)</div>
                        <input type="number" id="edit-actual-distance" value="${actualDistanceKm}" step="0.1" placeholder="0">
                    </div>
                    <div class="route-stat-box">
                        <div class="route-stat-label">Время план (ч:м)</div>
                        <input type="text" id="edit-planned-duration" value="${plannedDurationStr}" placeholder="00:00">
                    </div>
                    <div class="route-stat-box">
                        <div class="route-stat-label">Время факт (ч:м)</div>
                        <input type="text" id="edit-actual-duration" value="${actualDurationStr}" placeholder="00:00">
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <label class="section-label">Описание</label>
                <textarea id="edit-route-desc" rows="3">${escapeHtml(route.description || '')}</textarea>
            </div>

            <div class="detail-section">
                <label class="section-label">Точки маршрута</label>
                <div class="detail-waypoints">${waypointsHtml || '<p class="empty-hint">Нет точек</p>'}</div>
            </div>

            <div class="detail-section">
                <label class="section-label">Заметки</label>
                <textarea id="edit-route-notes" rows="4" placeholder="Свои заметки: что взять, где остановиться, стоимость...">${escapeHtml(route.notes || '')}</textarea>
            </div>

            <div class="detail-section">
                <label class="section-label">Фото (нажмите для увеличения)</label>
                <div class="route-photos" id="route-photos">
                    ${photosHtml || '<p class="empty-hint">Нет фото</p>'}
                </div>
                <input type="file" id="route-photo-input" accept="image/*" multiple style="margin-top: 10px; color: var(--text-secondary); font-size: 13px;">
            </div>

            <div class="detail-actions">
                <button class="btn btn-primary" onclick="saveRouteChanges('${routeId}')">💾 Сохранить изменения</button>
                <button class="btn btn-secondary" onclick="highlightRouteOnMap('${routeId}')">🗺️ На карте</button>
                <a class="btn btn-secondary" href="${getGetYourGuideUrl(route)}" target="_blank">🔗 Экскурсии</a>
                <button class="btn btn-secondary" onclick="closeRouteDetail()">Закрыть</button>
            </div>
        </div>
    `;

    const photoInput = document.getElementById('route-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => handleRoutePhotos(e, routeId));
    }
}

function closeRouteDetail() {
    const detail = document.getElementById('route-detail');
    if (detail) detail.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">🛤️</span>
            <p>Выберите маршрут слева, чтобы отредактировать детали, фото, даты и заметки.</p>
        </div>
    `;
    editingRouteId = null;
}

function saveRouteChanges(routeId) {
    const routes = getUserRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const nameInput = document.getElementById('edit-route-name');
    const dateInput = document.getElementById('edit-route-date');
    const descInput = document.getElementById('edit-route-desc');
    const notesInput = document.getElementById('edit-route-notes');
    const plannedDistanceInput = document.getElementById('edit-planned-distance');
    const actualDistanceInput = document.getElementById('edit-actual-distance');
    const plannedDurationInput = document.getElementById('edit-planned-duration');
    const actualDurationInput = document.getElementById('edit-actual-duration');

    if (nameInput) route.name = nameInput.value.trim();
    if (dateInput) route.date = dateInput.value;
    if (descInput) route.description = descInput.value.trim();
    if (notesInput) route.notes = notesInput.value.trim();

    if (plannedDistanceInput) {
        const km = parseFloat(plannedDistanceInput.value);
        route.plannedDistance = isNaN(km) ? 0 : km * 1000;
    }
    if (actualDistanceInput) {
        const km = parseFloat(actualDistanceInput.value);
        route.actualDistance = isNaN(km) ? 0 : km * 1000;
    }
    if (plannedDurationInput) route.plannedDuration = parseDurationInput(plannedDurationInput.value);
    if (actualDurationInput) route.actualDuration = parseDurationInput(actualDurationInput.value);

    saveUserRoutes(routes);
    renderUserRoutes();
    updatePlanner();
    showRouteNotification('💾 Маршрут обновлён');
}

function handleRoutePhotos(event, routeId) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const routes = getUserRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const readers = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    });

    Promise.all(readers).then(photos => {
        route.photos = route.photos || [];
        route.photos.push(...photos);
        saveUserRoutes(routes);
        editUserRoute(routeId);
    });
}

function deleteRoutePhoto(routeId, index) {
    const routes = getUserRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route || !route.photos) return;

    route.photos.splice(index, 1);
    saveUserRoutes(routes);
    editUserRoute(routeId);
}

function openRouteLightbox(src) {
    const lightbox = document.getElementById('route-lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lightbox || !img) return;
    img.src = src;
    lightbox.classList.remove('hidden');
}

function closeRouteLightbox() {
    const lightbox = document.getElementById('route-lightbox');
    if (lightbox) lightbox.classList.add('hidden');
}

function renderUserRoutes() {
    const container = document.getElementById('saved-routes');
    if (!container) return;

    const routes = getUserRoutes();

    if (routes.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>Пока нет сохранённых маршрутов. Создайте первый на карте или выберите города выше.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = routes.map(route => {
        const distance = route.distance ? `${(route.distance / 1000).toFixed(1)} км` : '';
        const duration = route.duration ? formatDuration(route.duration) : '';
        const date = route.date ? new Date(route.date) : null;
        const isActive = editingRouteId === route.id;

        return `
            <div class="route-row ${isActive ? 'active' : ''}" onclick="editUserRoute('${route.id}')">
                <div class="route-row-date">
                    <div class="route-row-day">${date ? date.getDate() : '—'}</div>
                    <div class="route-row-month">${date ? date.toLocaleDateString('ru-RU', { month: 'short' }) : ''}</div>
                </div>
                <div class="route-row-body">
                    <div class="route-row-name">${escapeHtml(route.name)}</div>
                    <div class="route-row-meta">
                        ${(route.waypoints || []).map(w => w.name.split(' (')[0]).join(' → ')}
                        ${distance ? ` • 🛣️ ${distance}` : ''}
                        ${duration ? ` • ⏱️ ${duration}` : ''}
                    </div>
                </div>
                <div class="route-row-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-secondary" onclick="highlightRouteOnMap('${route.id}')" title="На карте">🗺️</button>
                    <button class="btn btn-danger" onclick="deleteUserRoute('${route.id}')" title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function highlightRouteOnMap(routeId) {
    switchTab('map');

    const allRoutes = [...VIETNAM_DATA.routes, ...getUserRoutes(), ...getCustomCruises()];
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;

    // Пользовательский маршрут с сохранённой геометрией
    if (route.geometry && Array.isArray(route.geometry) && route.geometry.length > 0) {
        if (!routeLines[routeId]) {
            const line = L.polyline(route.geometry, {
                color: '#ff6b8a',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round'
            }).addTo(map);
            line.bindPopup(`<div class="popup-title">${escapeHtml(route.name)}</div><div class="popup-desc">${escapeHtml(route.description || '')}</div>`);
            routeLines[routeId] = line;
        }

        const line = routeLines[routeId];
        map.addLayer(line);
        map.fitBounds(line.getBounds(), { padding: [80, 80] });
        line.setStyle({ weight: 7, opacity: 1 });
        setTimeout(() => line.setStyle({ weight: 5, opacity: 0.9 }), 2000);
        return;
    }

    // Старые маршруты или предустановленные
    const fromItem = findItemById(route.from || route.waypoints?.[0]?.id);
    const toItem = findItemById(route.to || route.waypoints?.[route.waypoints.length - 1]?.id);
    if (!fromItem || !toItem) {
        if (fromItem) map.setView(fromItem.coords, 12);
        return;
    }

    if (route.from === route.to || (route.waypoints && route.waypoints.length === 1)) {
        map.setView(fromItem.coords, 10);
    } else {
        const bounds = L.latLngBounds([fromItem.coords, toItem.coords]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    if (routeLines[routeId]) {
        const line = routeLines[routeId];
        line.setStyle({ weight: 6, opacity: 1 });
        setTimeout(() => line.setStyle({ weight: 3, opacity: 0.7 }), 2000);
    }
}

function renderUserRoutesOnMap() {
    getUserRoutes().forEach(route => {
        if (route.geometry && Array.isArray(route.geometry) && route.geometry.length > 0) {
            const line = L.polyline(route.geometry, {
                color: '#ff6b8a',
                weight: 4,
                opacity: 0.8,
                lineCap: 'round'
            }).addTo(map);

            line.bindPopup(`
                <div class="popup-title">${escapeHtml(route.name)}</div>
                <div class="popup-desc">${escapeHtml(route.description || '')}</div>
            `);

            routeLines[route.id] = line;
            map.removeLayer(line);
        }
    });
}

function showRouteNotification(message) {
    const existing = document.querySelector('.route-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'route-notification';
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => div.classList.add('show'), 10);
    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 300);
    }, 4000);
}
