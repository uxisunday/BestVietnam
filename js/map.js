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
        maxZoom: 19
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

    const stamenTonerLite = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 18
    });

    const baseMaps = {
        "CartoDB Voyager": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map),
        "OpenStreetMap": osmLayer,
        "Stamen (подписи)": stamenTonerLite,
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

    // Кнопка «Добавить метку» — переключает режим установки
    const addPinBtn = document.getElementById('map-add-pin-btn');
    if (addPinBtn) {
        addPinBtn.addEventListener('click', () => {
            setAddPinMode(!addPinMode);
        });
    }

    // Глобальная обработка Esc для отмены режима выбора точки
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

    if (layer.startsWith('pin-')) {
        const pinType = layer.slice(4);
        userNoteMarkers.forEach(marker => {
            const note = marker.noteData;
            if (!note || note.pinType !== pinType) return;
            if (visible) marker.addTo(map);
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

// 5 цветных типов меток
const PIN_TYPES = {
    'want-to-visit': { icon: '⭐', color: '#e74c3c', name: 'Хочу побывать' },
    'visited':       { icon: '✅', color: '#27ae60', name: 'Уже были' },
    'food':          { icon: '🍴', color: '#f1c40f', name: 'Еда' },
    'housing':       { icon: '🏨', color: '#3498db', name: 'Жильё' },
    'note':          { icon: '📌', color: '#9b59b6', name: 'Заметка' }
};

function getPinTypeMeta(type) {
    return PIN_TYPES[type] || PIN_TYPES['note'];
}

let userNoteMarkers = [];      // массив L.Marker
let notePickerActive = false;  // включён ли режим выбора точки кликом по карте
let notePickerCallback = null; // функция, которую зовём с [lat, lng] при клике
let addPinMode = false;        // режим добавления метки через клик по карте
let pinDraftCoords = null;     // черновик координат для новой метки
let pinDraftAddress = null;    // черновик адреса (из Nominatim)
let pinDraftType = 'want-to-visit'; // выбранный тип в модалке
let reverseGeocodeQueue = Promise.resolve(); // глобальная очередь для throttle 1 req/sec

function createUserNoteIcon(icon, pinType) {
    // Если есть pinType — используем цветную шапку
    if (pinType && PIN_TYPES[pinType]) {
        const meta = PIN_TYPES[pinType];
        return L.divIcon({
            className: 'pin-marker',
            html: `<div class="pin-marker-circle" style="background:${meta.color}">${meta.icon}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -18]
        });
    }
    // Иначе — старая иконка с emoji (для заметок без pinType)
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
    const pinMeta = note.pinType ? getPinTypeMeta(note.pinType) : null;
    const cityName = note.cityName
        || (window.VIETNAM_DATA?.cities || []).find(c => c.id === note.city)?.name
        || '';
    const tagsHtml = (note.tags || []).filter(t => t !== 'pin').slice(0, 5).map(t => `<span class="user-note-popup-tag">#${escapeHtml(t)}</span>`).join(' ');

    if (pinMeta) {
        // Цветной popup для метки
        return `
            <div class="pin-popup" style="--pin-color: ${pinMeta.color}">
                <div class="pin-popup-header" style="background:${pinMeta.color}">
                    <span class="pin-popup-icon">${pinMeta.icon}</span>
                    <div class="pin-popup-title">${escapeHtml(note.title || 'Без названия')}</div>
                </div>
                <div class="pin-popup-body">
                    ${note.address ? `<div class="pin-popup-meta">📍 ${escapeHtml(note.address)}</div>` : ''}
                    ${cityName && !note.address ? `<div class="pin-popup-meta">📍 ${escapeHtml(cityName)}</div>` : ''}
                    ${note.body ? `<div class="pin-popup-text">${escapeHtml(note.body.substring(0, 200))}${note.body.length > 200 ? '…' : ''}</div>` : ''}
                    ${tagsHtml ? `<div class="pin-popup-tags">${tagsHtml}</div>` : ''}
                    <div class="pin-popup-date">📅 ${new Date(note.createdAt).toLocaleDateString('ru-RU')}</div>
                </div>
                <div class="pin-popup-actions">
                    <button class="btn btn-sm btn-primary" onclick="openPinInGoogleMaps('${escapeHtml(note.id)}')">🗺️ Google Maps</button>
                    <button class="btn btn-sm btn-secondary" onclick="openNoteInApp('${escapeHtml(note.id)}')">✏️</button>
                    <button class="btn btn-sm btn-secondary" onclick="deletePin('${escapeHtml(note.id)}')">🗑</button>
                </div>
            </div>
        `;
    }

    // Старый popup для заметок без pinType
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
        const marker = L.marker(note.coords, { icon: createUserNoteIcon(icon, note.pinType) });
        marker.noteId = note.id;
        marker.noteData = note;
        marker.bindPopup(createUserNotePopup(note));
        marker.addTo(map);

        // Применяем текущий pin-* фильтр
        if (note.pinType) {
            const cb = document.querySelector(`.layer-toggle[data-layer="pin-${note.pinType}"]`);
            if (cb && !cb.checked) {
                map.removeLayer(marker);
            }
        }
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
    const wasActive = notePickerActive;
    notePickerActive = !!on;
    notePickerCallback = onPick || null;
    const container = document.getElementById('map');
    if (!container) return;
    if (notePickerActive) {
        container.classList.add('note-picker-cursor');
        if (map) {
            map.getContainer().style.cursor = 'crosshair';
            // Одноразовый обработчик: сработает на первый клик, затем снимется сам
            map.once('click', onMapClickForNotePicker);
        }
        showRouteNotification('📍 Кликните по карте, чтобы выбрать точку. Esc — отмена.');
    } else {
        container.classList.remove('note-picker-cursor');
        if (map) {
            map.getContainer().style.cursor = '';
            // Снимаем ожидающий обработчик, если он не успел сработать
            if (wasActive) {
                map.off('click', onMapClickForNotePicker);
            }
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
    // Режим создания цветной метки (приоритет)
    if (addPinMode) {
        setAddPinMode(false);
        pinDraftCoords = [e.latlng.lat, e.latlng.lng];
        showRouteNotification('⏳ Определяем адрес...');
        reverseGeocode(e.latlng.lat, e.latlng.lng)
            .then(addr => {
                pinDraftAddress = addr;
                showPinCreateModal();
            })
            .catch(() => {
                pinDraftAddress = null;
                showPinCreateModal();
            });
        return;
    }
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
    if (e.key === 'Escape') {
        if (addPinMode) {
            setAddPinMode(false);
            return;
        }
        if (notePickerActive) {
            setNotePickerMode(false);
            notePickerCallback = null;
        }
    }
}

// ============================================
// ЦВЕТНЫЕ МЕТКИ — режим добавления + reverse geocoding
// ============================================

function setAddPinMode(on) {
    addPinMode = !!on;
    const container = document.getElementById('map');
    if (!container || !map) return;
    if (addPinMode) {
        // Снимаем старый picker, если был
        if (notePickerActive) setNotePickerMode(false);
        container.classList.add('note-picker-cursor');
        map.getContainer().style.cursor = 'crosshair';
        map.once('click', onMapClickForNotePicker);
        showRouteNotification('📍 Кликните по карте для установки метки. Esc — отмена.');
        const btn = document.getElementById('map-add-pin-btn');
        if (btn) btn.classList.add('active');
    } else {
        container.classList.remove('note-picker-cursor');
        map.getContainer().style.cursor = '';
        map.off('click', onMapClickForNotePicker);
        const btn = document.getElementById('map-add-pin-btn');
        if (btn) btn.classList.remove('active');
    }
}

// Обратный геокодинг через Nominatim с throttling 1 req/sec
async function reverseGeocode(lat, lng) {
    // Throttle: 1 запрос в 1.1 сек
    reverseGeocodeQueue = reverseGeocodeQueue.then(() => {
        return new Promise(resolve => setTimeout(resolve, 1100));
    });
    await reverseGeocodeQueue;

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'ru,en' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || data.error) return null;
        const a = data.address || {};
        const parts = [];
        if (a.house_number && a.road) parts.push(`${a.road}, ${a.house_number}`);
        else if (a.road) parts.push(a.road);
        else if (a.pedestrian) parts.push(a.pedestrian);
        else if (a.footway) parts.push(a.footway);
        if (a.suburb) parts.push(a.suburb);
        if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
        return {
            full: data.display_name,
            short: parts.join(', '),
            houseNumber: a.house_number || null,
            street: a.road || null,
            suburb: a.suburb || null,
            city: a.city || a.town || a.village || null
        };
    } catch (e) {
        console.warn('Reverse geocode failed:', e);
        return null;
    }
}

function setActivePinType(type) {
    pinDraftType = type;
    document.querySelectorAll('#pin-create-modal .pin-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

function showPinCreateModal() {
    const modal = document.getElementById('pin-create-modal');
    if (!modal) return;
    const titleInput = document.getElementById('pin-create-title');
    const addrInput = document.getElementById('pin-create-address');
    const bodyInput = document.getElementById('pin-create-body');

    titleInput.value = '';
    addrInput.value = pinDraftAddress?.short || '';
    bodyInput.value = '';
    const addNoteCb = document.getElementById('pin-create-add-note');
    if (addNoteCb) addNoteCb.checked = false;

    setActivePinType(pinDraftType);
    modal.hidden = false;
    setTimeout(() => titleInput.focus(), 50);
}

function closePinCreateModal() {
    const modal = document.getElementById('pin-create-modal');
    if (modal) modal.hidden = true;
    pinDraftCoords = null;
    pinDraftAddress = null;
}

async function savePin() {
    const titleInput = document.getElementById('pin-create-title');
    const addrInput = document.getElementById('pin-create-address');
    const bodyInput = document.getElementById('pin-create-body');
    const addNoteCb = document.getElementById('pin-create-add-note');

    const title = (titleInput?.value || '').trim();
    const address = (addrInput?.value || '').trim();
    const body = (bodyInput?.value || '').trim();
    const alsoFullNote = addNoteCb?.checked || false;

    if (!title) {
        titleInput?.focus();
        titleInput?.classList.add('input-error');
        setTimeout(() => titleInput?.classList.remove('input-error'), 1500);
        return;
    }
    if (!pinDraftCoords) {
        closePinCreateModal();
        return;
    }

    const pin = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title,
        body,
        address,
        coords: pinDraftCoords,
        category: pinDraftType,
        subcategory: null,
        tags: ['pin'],
        city: null,
        cityName: pinDraftAddress?.city || null,
        pinType: pinDraftType,
        visitDate: null,
        photo: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Сохраняем через существующее API заметок
    const notes = await (window.getNotes ? window.getNotes() : Promise.resolve(window.appData?.notes || []));
    notes.push(pin);
    if (window.saveNotes) {
        await window.saveNotes(notes);
    } else {
        // fallback — localStorage напрямую
        try {
            localStorage.setItem('vietnam_map_notes', JSON.stringify(notes));
        } catch (e) { console.warn('savePin localStorage failed', e); }
    }

    // Обновляем кэш приложения
    if (window.appData) {
        window.appData.notes = notes;
    }

    closePinCreateModal();

    // Синхронизируем кэш модуля заметок, если он загружен
    if (typeof window.__syncNotesCache === 'function') {
        try { await window.__syncNotesCache(notes); } catch (e) { /* no-op */ }
    }

    // Если из модуля заметок нужна полноценная запись — открываем редактор
    if (alsoFullNote) {
        if (typeof window.openNoteDraft === 'function') {
            switchTab('notes');
            setTimeout(() => window.openNoteDraft(pin.id), 200);
            return;
        }
    }

    // Иначе — просто рендерим маркер
    if (typeof window.renderUserNoteMarkers === 'function') {
        await window.renderUserNoteMarkers(notes);
    }
    focusOnUserNote(pin.id);
}

async function deletePin(noteId) {
    if (!confirm('Удалить метку?')) return;
    let notes = await (window.getNotes ? window.getNotes() : Promise.resolve(window.appData?.notes || []));
    notes = notes.filter(n => n.id !== noteId);
    if (window.saveNotes) {
        await window.saveNotes(notes);
    } else {
        try { localStorage.setItem('vietnam_map_notes', JSON.stringify(notes)); } catch (e) {}
    }
    if (window.appData) window.appData.notes = notes;
    if (typeof window.__syncNotesCache === 'function') {
        try { await window.__syncNotesCache(notes); } catch (e) {}
    }
    if (typeof window.renderUserNoteMarkers === 'function') {
        await window.renderUserNoteMarkers(notes);
    }
    showRouteNotification('🗑 Метка удалена');
}

function openPinInGoogleMaps(noteId) {
    const notes = window.appData?.notes || [];
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.coords) return;
    const [lat, lng] = note.coords;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}

async function refreshPinAddress() {
    if (!pinDraftCoords) return;
    const btn = document.getElementById('pin-refresh-addr');
    if (btn) btn.disabled = true;
    const addr = await reverseGeocode(pinDraftCoords[0], pinDraftCoords[1]);
    pinDraftAddress = addr;
    const input = document.getElementById('pin-create-address');
    if (input) input.value = addr?.short || '';
    if (btn) btn.disabled = false;
}

// ============================================
// Глобальный экспорт
// ============================================

window.renderUserNoteMarkers = renderUserNoteMarkers;
window.clearUserNoteMarkers = clearUserNoteMarkers;
window.focusOnUserNote = focusOnUserNote;
window.setNotePickerMode = setNotePickerMode;
window.openNoteInApp = openNoteInApp;
window.setAddPinMode = setAddPinMode;
window.savePin = savePin;
window.deletePin = deletePin;
window.openPinInGoogleMaps = openPinInGoogleMaps;
window.closePinCreateModal = closePinCreateModal;
window.setActivePinType = setActivePinType;
window.refreshPinAddress = refreshPinAddress;
window.PIN_TYPES = PIN_TYPES;
window.getPinTypeMeta = getPinTypeMeta;
