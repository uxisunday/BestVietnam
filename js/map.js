// ============================================
// ЛОГИКА КАРТЫ LEAFLET
// ============================================

let map;
let markers = {};
let routeLines = {};
let vietnamBoundary = null;
let neighborBoundaries = null;
let boundariesRenderer = null;

let routeWaypoints = [];
let builtRouteGeometry = null;
let builtRouteInfo = null;
let contextMarker = null;
let tempWaypointsLayer = null;
let userRouteLine = null;
const contextMenu = document.getElementById('map-context-menu');
const searchResultsBox = document.getElementById('map-search-results');

const MARKER_ICONS = {
    city: '🏙️',
    attraction: '🏛️',
    beach: '🏖️',
    airport: '✈️',
    port: '⚓'
};

const MARKER_COLORS = {
    city: '#6b8aff',
    attraction: '#facc15',
    beach: '#22d3ee',
    airport: '#4ade80',
    port: '#a78bfa'
};

function initMap() {
    map = L.map('map', {
        center: VIETNAM_DATA.center,
        zoom: VIETNAM_DATA.zoom,
        minZoom: 5,
        maxZoom: 16
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    });

    const baseMaps = {
        "CartoDB Voyager": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map),
        "OpenStreetMap": osmLayer,
        "Спутник": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 18
        })
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);

    boundariesRenderer = L.canvas({ padding: 0.5 }).addTo(map);
    loadCountryBoundaries();
    renderAllMarkers();
    renderRoutes();
    Object.values(routeLines).forEach(line => map.removeLayer(line));

    document.querySelectorAll('.layer-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', toggleLayer);
    });

    // Layer toggle for country fills
    const boundaryToggle = document.querySelector('.layer-toggle[data-layer="boundaries"]');
    if (boundaryToggle) boundaryToggle.addEventListener('change', toggleBoundariesLayer);

    initMapSearch();
    initContextMenu();
    initRouteBuilder();
    updateDashboardCounts();

    // Обработчик клика по карте в режиме выбора точки для заметки
    map.on('click', onMapClickForNotePicker);
    document.addEventListener('keydown', onMapKeyForNotePicker);
}

async function loadCountryBoundaries() {
    try {
        const response = await fetch('data/ne_50m_vietnam_neighbors.geojson');
        if (!response.ok) throw new Error('Country boundaries fetch failed');
        const data = await response.json();

        const countryStyles = {
            VNM: { name: 'Вьетнам', color: '#ff6b8a', fillOpacity: 0.22, weight: 2, opacity: 0.9 },
            CHN: { name: 'Китай', color: '#ef4444', fillOpacity: 0.12, weight: 1.5, opacity: 0.6 },
            LAO: { name: 'Лаос', color: '#facc15', fillOpacity: 0.12, weight: 1.5, opacity: 0.6 },
            KHM: { name: 'Камбоджа', color: '#a78bfa', fillOpacity: 0.12, weight: 1.5, opacity: 0.6 },
            THA: { name: 'Таиланд', color: '#22d3ee', fillOpacity: 0.08, weight: 1.5, opacity: 0.5 }
        };

        vietnamBoundary = L.geoJSON(data, {
            renderer: boundariesRenderer,
            filter: feature => feature.properties.ADM0_A3 === 'VNM',
            style: feature => {
                const style = countryStyles.VNM;
                return {
                    color: style.color,
                    weight: style.weight,
                    opacity: style.opacity,
                    fillColor: style.color,
                    fillOpacity: style.fillOpacity
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindTooltip('Вьетнам', { permanent: false, direction: 'center', className: 'country-tooltip' });
            }
        }).addTo(map);

        neighborBoundaries = L.geoJSON(data, {
            renderer: boundariesRenderer,
            filter: feature => Object.keys(countryStyles).includes(feature.properties.ADM0_A3) && feature.properties.ADM0_A3 !== 'VNM',
            style: feature => {
                const style = countryStyles[feature.properties.ADM0_A3];
                return {
                    color: style.color,
                    weight: style.weight,
                    opacity: style.opacity,
                    fillColor: style.color,
                    fillOpacity: style.fillOpacity
                };
            },
            onEachFeature: (feature, layer) => {
                const style = countryStyles[feature.properties.ADM0_A3];
                layer.bindTooltip(style.name, { permanent: false, direction: 'center', className: 'country-tooltip' });
            }
        }).addTo(map);
    } catch (error) {
        console.error('Country boundaries load error:', error);
    }
}

async function loadVietnamBoundary() {
    // Legacy alias, both boundaries now loaded together
    await loadCountryBoundaries();
}

async function loadNeighborBoundaries() {
    // Neighbors are loaded within loadCountryBoundaries
}

function toggleBoundariesLayer(e) {
    if (!neighborBoundaries) return;
    if (e.target.checked) {
        map.addLayer(neighborBoundaries);
    } else {
        map.removeLayer(neighborBoundaries);
    }
}

function createCustomMarker(item) {
    const icon = MARKER_ICONS[item.type] || '📍';
    return L.divIcon({
        className: 'custom-marker',
        html: icon,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

function renderAllMarkers() {
    const allItems = [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];

    allItems.forEach(item => {
        const marker = L.marker(item.coords, {
            icon: createCustomMarker(item)
        }).addTo(map);

        marker.bindPopup(createPopupContent(item));
        marker.itemId = item.id;
        marker.itemType = item.type;

        if (!markers[item.type]) markers[item.type] = [];
        markers[item.type].push(marker);
    });
}

function createPopupContent(item) {
    const typeLabels = {
        city: 'Город',
        attraction: 'Достопримечательность',
        beach: 'Пляж',
        airport: 'Аэропорт',
        port: 'Порт'
    };

    const imagesHtml = item.images
        .map(img => `<img src="${img}" alt="${item.name}" onclick="showGallery('${item.gallery || '#'}')">`)
        .join('');

    return `
        <div style="padding: 14px;">
            <div class="popup-title">${item.name}</div>
            <div class="popup-viet">(${item.nameViet})</div>
            <span class="popup-type ${item.type}">${typeLabels[item.type] || item.type}</span>
            <div class="popup-images">${imagesHtml}</div>
            <div class="popup-desc">${item.description}</div>
            <div class="popup-actions">
                <a class="btn btn-secondary" href="${item.gallery || '#'}" target="_blank">📷 Ещё фото</a>
                <button class="btn btn-secondary" onclick="showWeatherFor('${item.id}')">🌤️ Погода</button>
                <button class="btn btn-secondary" onclick="openNoteFor('${item.id}')">📝 Заметка</button>
            </div>
        </div>
    `;
}

function showGallery(url) {
    if (url && url !== '#') {
        window.open(url, '_blank');
    }
}

function toggleLayer(e) {
    const layer = e.target.dataset.layer;
    const visible = e.target.checked;

    if (layer === 'routes') {
        Object.values(routeLines).forEach(line => {
            if (visible) map.addLayer(line);
            else map.removeLayer(line);
        });
        return;
    }

    if (layer === 'user-notes') {
        userNoteMarkers.forEach(marker => {
            if (visible) map.addLayer(marker);
            else map.removeLayer(marker);
        });
        return;
    }

    if (markers[layer]) {
        markers[layer].forEach(marker => {
            if (visible) map.addLayer(marker);
            else map.removeLayer(marker);
        });
    }
}

// ============================================
// ПОИСК ПО КАРТЕ
// ============================================

function initMapSearch() {
    const input = document.getElementById('map-search');
    const btn = document.getElementById('map-search-btn');
    if (!input) return;

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        const results = searchMapItems(query);
        renderSearchResults(results, query);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSearchResults();
            input.blur();
        }
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query) {
                const results = searchMapItems(query.toLowerCase());
                if (results.length > 0) {
                    focusOnItem(results[0].item);
                } else {
                    searchGoogleMaps(query);
                }
                hideSearchResults();
            }
        }
    });

    if (btn) {
        btn.addEventListener('click', () => {
            const query = input.value.trim();
            if (!query) return;
            const results = searchMapItems(query.toLowerCase());
            if (results.length > 0) {
                focusOnItem(results[0].item);
            } else {
                searchGoogleMaps(query);
            }
            hideSearchResults();
        });
    }

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !searchResultsBox.contains(e.target)) {
            hideSearchResults();
        }
    });
}

function searchMapItems(query) {
    const allItems = [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];

    return allItems
        .map(item => {
            const haystack = `${item.name} ${item.nameViet} ${item.description}`.toLowerCase();
            let score = 0;
            if (item.name.toLowerCase().startsWith(query)) score += 3;
            else if (item.name.toLowerCase().includes(query)) score += 2;
            else if (haystack.includes(query)) score += 1;
            return { item, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
}

function renderSearchResults(results, query) {
    if (!searchResultsBox) return;

    if (results.length === 0) {
        searchResultsBox.innerHTML = `
            <div class="search-result-item external" onclick="searchGoogleMaps('${escapeHtml(query)}')">
                <div class="result-name">🔍 Искать "${escapeHtml(query)}" в Google Maps</div>
            </div>
        `;
        searchResultsBox.classList.remove('hidden');
        return;
    }

    searchResultsBox.innerHTML = results.map(r => {
        const item = r.item;
        const typeLabels = { city: 'Город', attraction: 'Достопримечательность', beach: 'Пляж', airport: 'Аэропорт', port: 'Порт' };
        return `
            <div class="search-result-item" onclick="focusOnItemById('${item.id}')">
                <div class="result-name">${item.name} <span class="result-viet">(${item.nameViet})</span></div>
                <div class="result-type">${typeLabels[item.type] || item.type}</div>
            </div>
        `;
    }).join('') + `
        <div class="search-result-item external" onclick="searchGoogleMaps('${escapeHtml(query)}')">
            <div class="result-name">🔍 Искать "${escapeHtml(query)}" в Google Maps</div>
        </div>
    `;

    searchResultsBox.classList.remove('hidden');
}

function hideSearchResults() {
    if (searchResultsBox) searchResultsBox.classList.add('hidden');
}

function focusOnItemById(itemId) {
    const item = findItemById(itemId);
    if (item) focusOnItem(item);
    hideSearchResults();
}

function focusOnItem(item) {
    switchTab('map');
    setTimeout(() => {
        map.setView(item.coords, 12);
        const marker = Object.values(markers).flat().find(m => m.itemId === item.id);
        if (marker) marker.openPopup();
    }, 100);
}

function searchGoogleMaps(query) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ', Vietnam')}`;
    window.open(url, '_blank');
    hideSearchResults();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================
// КОНТЕКСТНОЕ МЕНЮ
// ============================================

function initContextMenu() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || !contextMenu) return;

    mapContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const latLng = map.mouseEventToLatLng(e);
        showContextMenu(e.clientX, e.clientY, latLng);
    });

    document.addEventListener('click', () => hideContextMenu());

    contextMenu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const lat = parseFloat(contextMenu.dataset.lat);
            const lng = parseFloat(contextMenu.dataset.lng);
            handleContextAction(action, [lat, lng]);
            hideContextMenu();
        });
    });
}

function showContextMenu(x, y, latLng) {
    if (!contextMenu) return;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.dataset.lat = latLng.lat;
    contextMenu.dataset.lng = latLng.lng;
    contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
    if (contextMenu) contextMenu.classList.add('hidden');
}

function handleContextAction(action, coords) {
    if (action === 'waypoint') {
        addRouteWaypoint(coords);
    } else if (action === 'google') {
        const url = `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`;
        window.open(url, '_blank');
    }
}

// ============================================
// КОНСТРУКТОР МАРШРУТОВ
// ============================================

async function initRouteBuilder() {
    const dateInput = document.getElementById('new-route-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const clearBtn = document.getElementById('clear-waypoints');
    const buildBtn = document.getElementById('build-route');
    const saveBtn = document.getElementById('save-built-route');

    if (clearBtn) clearBtn.addEventListener('click', clearRouteWaypoints);
    if (buildBtn) buildBtn.addEventListener('click', buildRouteOnRoads);
    if (saveBtn) saveBtn.addEventListener('click', saveBuiltRoute);

    await updateRouteBuilderStatus();
}

async function updateRouteBuilderStatus() {
    const el = document.getElementById('builder-status');
    if (!el) return;

    const settings = await getSettings();
    const orsKey = settings?.orsKey || '';
    if (orsKey) {
        el.textContent = 'ORS — премиум маршрутизатор активен';
        el.classList.add('ors-active');
    } else {
        el.textContent = 'OSRM — бесплатный маршрутизатор';
        el.classList.remove('ors-active');
    }
}

function toggleRouteBuilder() {
    const panel = document.getElementById('route-builder-panel');
    const toggle = document.getElementById('builder-toggle');
    if (!panel || !toggle) return;

    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        toggle.classList.add('hidden');
    } else {
        panel.classList.add('collapsed');
        toggle.classList.remove('hidden');
    }
}

function addRouteWaypoint(coords) {
    if (routeWaypoints.length >= 10) {
        alert('Максимум 10 точек в одном маршруте');
        return;
    }

    const item = findItemByCoords(coords);
    routeWaypoints.push({
        id: item ? item.id : 'wp-' + Date.now(),
        name: item ? `${item.name} (${item.nameViet})` : 'Точка на карте',
        coords: coords
    });

    renderWaypointsList();
    renderTempWaypoints();
    showRouteNotification(`➕ Точка добавлена (${routeWaypoints.length})`);
}

function removeWaypoint(index) {
    routeWaypoints.splice(index, 1);
    renderWaypointsList();
    renderTempWaypoints();
    clearBuiltRoute();
}

function clearRouteWaypoints() {
    routeWaypoints = [];
    renderWaypointsList();
    renderTempWaypoints();
    clearBuiltRoute();
}

function renderWaypointsList() {
    const container = document.getElementById('route-waypoints-list');
    if (!container) return;

    if (routeWaypoints.length === 0) {
        container.innerHTML = `<div class="waypoints-empty">Правый клик на карте → «Добавить точку»</div>`;
        return;
    }

    container.innerHTML = routeWaypoints.map((wp, i) => `
        <div class="waypoint-item">
            <span class="waypoint-number">${i + 1}</span>
            <span class="waypoint-name">${escapeHtml(wp.name)}</span>
            <button class="btn-icon" onclick="removeWaypoint(${i})" title="Удалить">✕</button>
        </div>
    `).join('');
}

function renderTempWaypoints() {
    if (tempWaypointsLayer) map.removeLayer(tempWaypointsLayer);
    if (routeWaypoints.length === 0) return;

    const markers = routeWaypoints.map((wp, i) => {
        return L.marker(wp.coords, {
            icon: L.divIcon({
                className: 'waypoint-marker',
                html: `<div class="waypoint-badge">${i + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        });
    });

    tempWaypointsLayer = L.layerGroup(markers).addTo(map);
}

function findItemByCoords(coords, tolerance = 0.03) {
    const allItems = [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];

    return allItems.find(item => {
        const dLat = Math.abs(item.coords[0] - coords[0]);
        const dLng = Math.abs(item.coords[1] - coords[1]);
        return dLat < tolerance && dLng < tolerance;
    });
}

async function buildRouteOnRoads() {
    if (routeWaypoints.length < 2) {
        alert('Добавьте минимум 2 точки');
        return;
    }

    const saveBtn = document.getElementById('save-built-route');
    const infoEl = document.getElementById('route-info');
    if (saveBtn) saveBtn.disabled = true;
    if (infoEl) infoEl.innerHTML = '<span class="route-info-loading">Строим маршрут...</span>';

    try {
        const result = await fetchRouteFromOSRM(routeWaypoints);
        builtRouteGeometry = result.geometry;
        builtRouteInfo = result;

        drawBuiltRoute(result.geometry);

        const distanceKm = (result.distance / 1000).toFixed(1);
        const durationH = Math.floor(result.duration / 3600);
        const durationM = Math.floor((result.duration % 3600) / 60);
        const engineLabel = result.engine === 'ors' ? 'ORS' : 'OSRM';

        if (infoEl) {
            infoEl.innerHTML = `
                <div class="route-info-row"><strong>Расстояние:</strong> ${distanceKm} км</div>
                <div class="route-info-row"><strong>Время в пути:</strong> ${durationH} ч ${durationM} мин</div>
                <div class="route-info-row"><strong>Точек:</strong> ${routeWaypoints.length}</div>
                <div class="route-info-row" style="margin-top: 8px; color: var(--accent-blue);">Маршрутизатор: ${engineLabel}</div>
            `;
        }

        if (saveBtn) saveBtn.disabled = false;
        showRouteNotification(`🛣️ Маршрут построен (${engineLabel}): ${distanceKm} км, ~${durationH} ч ${durationM} мин`);
    } catch (error) {
        console.error('Route build error:', error);
        const settings = await getSettings();
        const orsKey = settings?.orsKey || '';
        const rawMsg = error.message || 'unknown error';
        const errorHint = rawMsg.includes('ORS')
            ? 'ORS вернул ошибку; попробуйте удалить ключ в Settings → OpenRouteService или нажмите кнопку ниже, чтобы построить через бесплатный OSRM.'
            : 'OSRM недоступен для этих точек или сеть заблокировала запрос.';

        if (infoEl) {
            infoEl.innerHTML = `
                <span class="route-info-error">${escapeHtml(errorHint)}</span>
                ${orsKey ? `<div style="margin-top: 10px;"><button class="btn btn-sm btn-secondary" onclick="clearORSKeyAndRebuild()">Построить через OSRM</button></div>` : ''}
            `;
        }
        alert('Ошибка построения маршрута. ' + errorHint);
    }
}

async function fetchRouteFromOSRM(waypoints) {
    const orsKey = localStorage.getItem('vietnam_map_ors_key');

    if (orsKey) {
        try {
            return await fetchRouteFromORS(waypoints, orsKey);
        } catch (e) {
            console.warn('ORS failed, falling back to OSRM', e);
            try {
                return await fetchRouteFromOSRMFree(waypoints);
            } catch (osrmError) {
                throw new Error('ORS failed, OSRM fallback also failed: ' + (osrmError.message || 'unknown'));
            }
        }
    }

    return await fetchRouteFromOSRMFree(waypoints);
}

async function fetchRouteFromOSRMFree(waypoints) {
    const coordsStr = waypoints.map(p => `${p.coords[1]},${p.coords[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=polyline6`;

    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`OSRM request failed: ${response.status} ${text}`);
    }
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error('No route found');

    const route = data.routes[0];
    return {
        geometry: decodePolyline6(route.geometry),
        distance: route.distance,
        duration: route.duration,
        engine: 'osrm'
    };
}

async function fetchRouteFromORS(waypoints, apiKey) {
    const coords = waypoints.map(p => [p.coords[1], p.coords[0]]);
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates: coords })
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`ORS request failed: ${response.status} ${text}`);
    }
    const data = await response.json();
    const feature = data.features[0];
    return {
        geometry: feature.geometry.coordinates.map(c => [c[1], c[0]]),
        distance: feature.properties.summary.distance,
        duration: feature.properties.summary.duration,
        engine: 'ors'
    };
}

async function clearORSKeyAndRebuild() {
    const settings = await getSettings();
    settings.orsKey = '';
    await saveSettings(settings);
    updateRouteBuilderStatus();
    buildRouteOnRoads();
}

function decodePolyline6(encoded) {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    const len = encoded.length;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0; result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        coordinates.push([lat / 1e6, lng / 1e6]);
    }
    return coordinates;
}

function drawBuiltRoute(geometry) {
    clearBuiltRoute();
    if (!geometry || geometry.length === 0) return;

    builtRouteGeometry = geometry;
    userRouteLine = L.polyline(geometry, {
        color: '#ff6b8a',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(userRouteLine.getBounds(), { padding: [80, 80] });
}

function clearBuiltRoute() {
    if (userRouteLine) {
        map.removeLayer(userRouteLine);
        userRouteLine = null;
    }
    builtRouteGeometry = null;
    builtRouteInfo = null;
    const saveBtn = document.getElementById('save-built-route');
    if (saveBtn) saveBtn.disabled = true;
    const infoEl = document.getElementById('route-info');
    if (infoEl) infoEl.innerHTML = '';
}

async function saveBuiltRoute() {
    const nameInput = document.getElementById('new-route-name');
    const dateInput = document.getElementById('new-route-date');
    const descInput = document.getElementById('new-route-desc');

    const name = nameInput ? nameInput.value.trim() : '';
    const date = dateInput ? dateInput.value : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!name) {
        alert('Введите название маршрута');
        return;
    }
    if (routeWaypoints.length < 2) {
        alert('Добавьте минимум 2 точки');
        return;
    }

    const newRoute = {
        id: 'route-' + Date.now(),
        name,
        date,
        description,
        waypoints: JSON.parse(JSON.stringify(routeWaypoints)),
        geometry: builtRouteGeometry ? JSON.parse(JSON.stringify(builtRouteGeometry)) : null,
        distance: builtRouteInfo ? builtRouteInfo.distance : 0,
        duration: builtRouteInfo ? builtRouteInfo.duration : 0,
        photos: [],
        notes: '',
        createdAt: new Date().toISOString()
    };

    const routes = await getUserRoutes();
    routes.push(newRoute);
    await saveUserRoutes(routes);

    clearRouteWaypoints();
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';

    renderUserRoutes();
    updatePlanner();
    showRouteNotification('💾 Маршрут сохранён в раздел Routes и Планнер');

    setTimeout(() => switchTab('routes'), 600);
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

// ============================================
// ПРЕДУСТАНОВЛЕННЫЕ МАРШРУТЫ (data.js)
// ============================================

function renderRoutes() {
    const pointMap = {};
    const allPoints = [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];
    allPoints.forEach(p => pointMap[p.id] = p.coords);

    VIETNAM_DATA.routes.forEach(route => {
        if (route.type === 'info') return;

        let routePath;
        if (route.path && Array.isArray(route.path) && route.path.length >= 2) {
            routePath = route.path;
        } else {
            const fromCoords = pointMap[route.from];
            const toCoords = pointMap[route.to];
            if (!fromCoords || !toCoords) return;
            routePath = [fromCoords, toCoords];
        }

        const line = L.polyline(routePath, {
            color: route.color,
            weight: 3,
            opacity: 0.7,
            dashArray: route.type === 'flight' ? '10, 10' : route.type === 'cruise' ? '5, 10' : '1',
            lineCap: 'round'
        }).addTo(map);

        line.bindPopup(`
            <div class="popup-title">${route.name}</div>
            <div class="popup-desc">${route.description}</div>
        `);

        routeLines[route.id] = line;
    });
}

function updateDashboardCounts() {}

function showWeatherFor(itemId) {
    switchTab('weather');
    setTimeout(() => selectWeatherItem(itemId), 100);
}

function openNoteFor(itemId) {
    switchTab('notes');
    setTimeout(() => selectNoteItem(itemId), 100);
}

function findItemById(id) {
    const allItems = [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];
    return allItems.find(item => item.id === id);
}

// ============================================
// СЛОЙ "МОИ ЗАМЕТКИ" — пользовательские точки
// ============================================

let userNoteMarkers = [];      // массив L.Marker
let notePickerActive = false;  // включён ли режим выбора точки кликом по карте
let notePickerCallback = null; // функция, которую зовём с [lat, lng] при клике

function createUserNoteIcon(icon) {
    const symbol = icon || '📌';
    return L.divIcon({
        className: 'user-note-marker',
        html: `<div class="user-note-marker-inner">${symbol}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

function createUserNotePopup(note) {
    const cityName = note.cityName
        || (window.VIETNAM_DATA?.cities || []).find(c => c.id === note.city)?.name
        || '';
    const tagsHtml = (note.tags || []).slice(0, 5).map(t => `<span class="user-note-popup-tag">#${escapeHtml(t)}</span>`).join(' ');
    return `
        <div style="padding: 10px; min-width: 200px; max-width: 280px;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${escapeHtml(note.title || 'Без названия')}</div>
            ${cityName ? `<div style="color: var(--accent); font-size: 12px; margin-bottom: 6px;">📍 ${escapeHtml(cityName)}</div>` : ''}
            ${note.address ? `<div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 6px;">${escapeHtml(note.address)}</div>` : ''}
            ${note.body ? `<div style="font-size: 13px; line-height: 1.4; margin-bottom: 8px;">${escapeHtml(note.body.substring(0, 150))}${note.body.length > 150 ? '…' : ''}</div>` : ''}
            ${tagsHtml ? `<div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">${tagsHtml}</div>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="openNoteInApp('${escapeHtml(note.id)}')">✏️ Редактировать</button>
        </div>
    `;
}

async function renderUserNoteMarkers(notes) {
    if (!map) return;
    clearUserNoteMarkers();

    if (!Array.isArray(notes)) return;
    const cats = window.DEFAULT_CATEGORIES_FROM_NOTES || []; // не обязательно
    // Получаем категории через notes.js (там же где кэш)
    const getCat = (catId) => {
        if (typeof window.getAllCategories === 'function') {
            return window.getAllCategories().find(c => c.id === catId);
        }
        return null;
    };

    notes.forEach(note => {
        if (!note.coords || !Array.isArray(note.coords) || note.coords.length !== 2) return;
        const cat = getCat(note.category);
        const icon = cat?.icon || '📌';
        const marker = L.marker(note.coords, { icon: createUserNoteIcon(icon) });
        marker.noteId = note.id;
        marker.bindPopup(createUserNotePopup(note));
        marker.addTo(map);
        userNoteMarkers.push(marker);
    });
}

function clearUserNoteMarkers() {
    userNoteMarkers.forEach(m => {
        if (map) map.removeLayer(m);
    });
    userNoteMarkers = [];
}

function focusOnUserNote(noteId) {
    const marker = userNoteMarkers.find(m => m.noteId === noteId);
    if (!marker) {
        // попробуем найти в кэше и обновить
        const cache = typeof window.__getNotesCache === 'function' ? window.__getNotesCache() : [];
        const note = cache.find(n => n.id === noteId);
        if (note && note.coords) {
            map.setView(note.coords, 14);
        }
        return;
    }
    map.setView(marker.getLatLng(), 14);
    setTimeout(() => marker.openPopup(), 200);
}

function setNotePickerMode(on, onPick) {
    notePickerActive = !!on;
    notePickerCallback = onPick || null;
    console.log('[note-picker] setNotePickerMode', { on, hasMap: !!map });
    const container = document.getElementById('map');
    if (!container) {
        console.warn('[note-picker] #map container not found');
        return;
    }
    if (notePickerActive) {
        container.classList.add('note-picker-cursor');
        if (map) {
            map.getContainer().style.cursor = 'crosshair';
        }
        showRouteNotification('📍 Кликните по карте, чтобы выбрать точку. Esc — отмена.');
    } else {
        container.classList.remove('note-picker-cursor');
        if (map) {
            map.getContainer().style.cursor = '';
        }
    }
}

function openNoteInApp(noteId) {
    if (typeof switchTab === 'function') switchTab('notes');
    if (typeof window.openNoteDraft === 'function') {
        setTimeout(() => window.openNoteDraft(noteId), 150);
    }
}

// Глобальный обработчик клика по карте — в режиме выбора точки
// (навешивается один раз при initMap, см. ниже)
function onMapClickForNotePicker(e) {
    console.log('[note-picker] map click', { active: notePickerActive, hasCb: !!notePickerCallback });
    if (!notePickerActive) return;
    const coords = [e.latlng.lat, e.latlng.lng];
    setNotePickerMode(false);
    if (typeof notePickerCallback === 'function') {
        notePickerCallback(coords);
    }
    notePickerCallback = null;
}

// Обработчик Esc для отмены режима
function onMapKeyForNotePicker(e) {
    if (e.key === 'Escape' && notePickerActive) {
        setNotePickerMode(false);
        notePickerCallback = null;
    }
}

// ============================================
// Глобальный экспорт
// ============================================

window.renderUserNoteMarkers = renderUserNoteMarkers;
window.clearUserNoteMarkers = clearUserNoteMarkers;
window.focusOnUserNote = focusOnUserNote;
window.setNotePickerMode = setNotePickerMode;
window.openNoteInApp = openNoteInApp;
