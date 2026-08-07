// ============================================
// ЗАМЕТКИ: пользовательские заметки с категориями,
// тегами, адресом и точкой на карте.
// Хранение: массив объектов в localStorage/облаке под ключом 'notes'.
// ============================================

const DEFAULT_CATEGORIES = [
    { id: 'medicine',     icon: '🏥', name: 'Медицина',      subcategories: [
        { id: 'clinic',    name: 'Клиника' },
        { id: 'dentist',   name: 'Стоматология' },
        { id: 'pharmacy',  name: 'Аптека' },
        { id: 'hospital',  name: 'Больница' }
    ]},
    { id: 'housing',      icon: '🏠', name: 'Жильё',         subcategories: [
        { id: 'hotel',     name: 'Отель' },
        { id: 'apartment', name: 'Апартаменты' },
        { id: 'hostel',    name: 'Хостел' },
        { id: 'longterm',  name: 'Долгосрочная аренда' }
    ]},
    { id: 'transport',    icon: '🚌', name: 'Транспорт',     subcategories: [
        { id: 'airport',   name: 'Аэропорт' },
        { id: 'bus',       name: 'Автобус' },
        { id: 'train',     name: 'Поезд' },
        { id: 'taxi',      name: 'Такси/Grab' },
        { id: 'rental',    name: 'Аренда байка/авто' }
    ]},
    { id: 'food',         icon: '🍜', name: 'Еда',           subcategories: [
        { id: 'cafe',      name: 'Кафе' },
        { id: 'restaurant',name: 'Ресторан' },
        { id: 'streetfood',name: 'Стритфуд' },
        { id: 'market',    name: 'Рынок/магазин' }
    ]},
    { id: 'shopping',     icon: '🛍️', name: 'Шоппинг',       subcategories: [
        { id: 'mall',      name: 'ТЦ' },
        { id: 'souvenir',  name: 'Сувениры' },
        { id: 'clothes',   name: 'Одежда' },
        { id: 'electronics', name: 'Техника' }
    ]},
    { id: 'entertainment',icon: '🎭', name: 'Развлечения',   subcategories: [
        { id: 'spa',       name: 'Спа/массаж' },
        { id: 'beach',     name: 'Пляж' },
        { id: 'museum',    name: 'Музей' },
        { id: 'nightlife', name: 'Ночная жизнь' }
    ]},
    { id: 'other',        icon: '📦', name: 'Другое',        subcategories: [] }
];

// -------------------- runtime state --------------------

let notesCache = [];              // синхронизированный список заметок
let customCategoriesCache = {     // пользовательские категории и подкатегории
    categories: [],               // [{ id, icon, name }]
    subcategories: []             // [{ id, parentId, name }]
};
let currentDraft = null;          // null | 'new' | noteId
let activeCategory = null;        // id выбранной категории (или null)
let activeSubcategory = null;     // id выбранной подкатегории (или null)
let activeCityFilter = null;      // id города (или null)
let activeTagFilter = null;       // строка-тег (или null)
let expandedCategories = new Set(['medicine', 'housing']);  // раскрытые по умолчанию

// -------------------- init --------------------

async function initNotes() {
    notesCache = await getNotes();
    if (!Array.isArray(notesCache)) notesCache = [];
    customCategoriesCache = await getNoteCategories();
    if (!customCategoriesCache || typeof customCategoriesCache !== 'object') {
        customCategoriesCache = { categories: [], subcategories: [] };
    }
    customCategoriesCache.categories = customCategoriesCache.categories || [];
    customCategoriesCache.subcategories = customCategoriesCache.subcategories || [];

    // Если категория ещё не выбрана — выбираем первую по умолчанию
    if (!activeCategory) {
        activeCategory = DEFAULT_CATEGORIES[0].id;
    }

    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);

    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderNotesList(e.target.value);
        });
    }
}

// -------------------- категории и подкатегории --------------------

function getAllCategories() {
    return [...DEFAULT_CATEGORIES, ...customCategoriesCache.categories];
}

function getCategoryById(id) {
    return getAllCategories().find(c => c.id === id) || null;
}

function getAllSubcategories(categoryId) {
    const def = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    const subs = def ? def.subcategories : [];
    const custom = customCategoriesCache.subcategories.filter(s => s.parentId === categoryId);
    return [...subs, ...custom];
}

function getSubcategoryName(categoryId, subId) {
    if (!subId) return '';
    const all = getAllSubcategories(categoryId);
    return (all.find(s => s.id === subId) || {}).name || subId;
}

function countNotesInCategory(categoryId) {
    return notesCache.filter(n => n.category === categoryId).length;
}

function countNotesInSubcategory(categoryId, subId) {
    return notesCache.filter(n => n.category === categoryId && n.subcategory === subId).length;
}

// -------------------- рендер: дерево слева --------------------

function renderNotesTree() {
    const container = document.getElementById('notes-tree');
    if (!container) return;

    const html = getAllCategories().map(cat => {
        const isExpanded = expandedCategories.has(cat.id);
        const subs = getAllSubcategories(cat.id);
        const catCount = countNotesInCategory(cat.id);
        const isActive = activeCategory === cat.id;

        const subsHtml = subs.map(sub => {
            const subCount = countNotesInSubcategory(cat.id, sub.id);
            const isSubActive = activeSubcategory === sub.id;
            return `
                <div class="notes-tree-subitem ${isSubActive ? 'active' : ''}"
                     data-category="${escapeAttr(cat.id)}"
                     data-subcategory="${escapeAttr(sub.id)}">
                    <span class="notes-tree-dot" onclick="selectNoteSubcategory('${escapeAttr(cat.id)}','${escapeAttr(sub.id)}')">·</span>
                    <span class="notes-tree-label" onclick="selectNoteSubcategory('${escapeAttr(cat.id)}','${escapeAttr(sub.id)}')">${escapeHtml(sub.name)}</span>
                    <span class="notes-tree-count" onclick="selectNoteSubcategory('${escapeAttr(cat.id)}','${escapeAttr(sub.id)}')">${subCount}</span>
                    <span class="notes-tree-remove" title="Удалить подкатегорию" onclick="event.stopPropagation(); removeSubcategoryPrompt('${escapeAttr(cat.id)}','${escapeAttr(sub.id)}',${subCount})">✕</span>
                </div>
            `;
        }).join('');

        const customAddHtml = isExpanded ? `
            <div class="notes-tree-addsub" onclick="event.stopPropagation(); addCustomSubcategoryPrompt('${escapeAttr(cat.id)}')">
                + подкатегория
            </div>
        ` : '';

        return `
            <div class="notes-tree-category ${isActive ? 'active' : ''}" data-category="${escapeAttr(cat.id)}">
                <div class="notes-tree-header" onclick="toggleNoteCategory('${escapeAttr(cat.id)}')">
                    <span class="notes-tree-toggle">${isExpanded ? '▾' : '▸'}</span>
                    <span class="notes-tree-icon">${cat.icon || '📁'}</span>
                    <span class="notes-tree-name">${escapeHtml(cat.name)}</span>
                    <span class="notes-tree-count">${catCount}</span>
                </div>
                ${isExpanded ? `<div class="notes-tree-subs">${subsHtml}${customAddHtml}</div>` : ''}
            </div>
        `;
    }).join('');

    const addCategoryHtml = `
        <div class="notes-tree-addcategory" onclick="addCustomCategoryPrompt()">
            + Добавить категорию
        </div>
    `;

    container.innerHTML = html + addCategoryHtml;
}

function toggleNoteCategory(categoryId) {
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
    }
    selectNoteCategory(categoryId);
}

function selectNoteCategory(categoryId) {
    activeCategory = categoryId;
    activeSubcategory = null;
    currentDraft = null;
    expandedCategories.add(categoryId);
    renderNotesTree();
    renderNotesList();
    renderNoteEditor(null);
}

function selectNoteSubcategory(categoryId, subId) {
    activeCategory = categoryId;
    activeSubcategory = subId;
    currentDraft = null;
    expandedCategories.add(categoryId);
    renderNotesTree();
    renderNotesList();
    renderNoteEditor(null);
}

function filterBySubcategory(subId) {
    activeSubcategory = activeSubcategory === subId ? null : subId;
    currentDraft = null;
    renderNotesList();
    renderNoteEditor(null);
}

function clearSubcategoryFilter() {
    activeSubcategory = null;
    currentDraft = null;
    renderNotesList();
    renderNoteEditor(null);
}

// -------------------- рендер: список карточек --------------------

function renderNotesList(searchQuery) {
    const container = document.getElementById('notes-list');
    if (!container) return;

    const q = (searchQuery || '').trim().toLowerCase();
    let list = notesCache;

    if (activeCategory) {
        list = list.filter(n => n.category === activeCategory);
        if (activeSubcategory) {
            list = list.filter(n => n.subcategory === activeSubcategory);
        }
    }
    if (activeCityFilter) {
        list = list.filter(n => {
            // activeCityFilter может быть: 'id:hanoi' | 'name:Ханой' | 'hanoi' | 'Ханой'
            if (activeCityFilter.startsWith('id:')) {
                return n.city === activeCityFilter.slice(3);
            }
            if (activeCityFilter.startsWith('name:')) {
                const target = activeCityFilter.slice(5).toLowerCase();
                return (n.cityName || '').toLowerCase() === target;
            }
            // без префикса — пробуем оба
            return n.city === activeCityFilter
                || (n.cityName || '').toLowerCase() === activeCityFilter.toLowerCase();
        });
    }
    if (activeTagFilter) {
        list = list.filter(n => (n.tags || []).includes(activeTagFilter));
    }
    if (q) {
        list = list.filter(n => {
            const city = getCityName(n.city) || '';
            return (n.title || '').toLowerCase().includes(q) ||
                   (n.body || '').toLowerCase().includes(q) ||
                   (n.address || '').toLowerCase().includes(q) ||
                   (n.tags || []).some(t => t.toLowerCase().includes(q)) ||
                   city.toLowerCase().includes(q);
        });
    }

    list = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Шапка с быстрым переключением подкатегорий — в отдельный контейнер #notes-subbar
    const subbarEl = document.getElementById('notes-subbar');
    if (subbarEl) {
        if (activeCategory) {
            const subs = getAllSubcategories(activeCategory);
            subbarEl.innerHTML = `
                <div class="notes-subbar">
                    <button class="filter-chip ${!activeSubcategory ? 'active' : ''}" onclick="clearSubcategoryFilter()">Все (${countNotesInCategory(activeCategory)})</button>
                    ${subs.map(s => {
                        const cnt = countNotesInSubcategory(activeCategory, s.id);
                        return `<button class="filter-chip ${activeSubcategory === s.id ? 'active' : ''}" onclick="filterBySubcategory('${escapeAttr(s.id)}')">${escapeHtml(s.name)} (${cnt})</button>`;
                    }).join('')}
                </div>
            `;
            subbarEl.style.display = '';
        } else {
            subbarEl.innerHTML = '';
            subbarEl.style.display = 'none';
        }
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>${q || activeTagFilter || activeCityFilter || activeSubcategory
                    ? 'Ничего не найдено по фильтру.'
                    : 'Пока нет заметок в этой категории. Нажмите «➕ Добавить заметку».'}</p>
            </div>
        `;
        return;
    }

    const cardsHtml = list.map(n => {
        const cityName = getCityName(n.city, n.cityName);
        const subName = getSubcategoryName(n.category, n.subcategory);
        const tagsHtml = (n.tags || []).slice(0, 4).map(t =>
            `<span class="note-tag-chip small" onclick="event.stopPropagation(); filterByTag('${escapeAttr(t)}')">#${escapeHtml(t)}</span>`
        ).join('');
        const cat = getCategoryById(n.category);
        return `
            <div class="note-preview-card ${currentDraft === n.id ? 'active' : ''}" onclick="openNoteDraft('${escapeAttr(n.id)}')">
                <div class="note-preview-title">${cat?.icon || '📌'} ${escapeHtml(n.title || 'Без названия')}</div>
                ${subName ? `<div class="note-preview-sub">${escapeHtml(subName)}</div>` : ''}
                ${n.body ? `<div class="note-preview-body">${escapeHtml(n.body.substring(0, 90))}${n.body.length > 90 ? '…' : ''}</div>` : ''}
                <div class="note-preview-meta">
                    ${cityName ? `<span class="note-preview-city">📍 ${escapeHtml(cityName)}</span>` : ''}
                    ${n.coords ? '<span title="Есть точка на карте">🗺️</span>' : ''}
                </div>
                ${tagsHtml ? `<div class="note-preview-tags">${tagsHtml}</div>` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHtml;
}

// -------------------- рендер: чипсы фильтров --------------------

function renderFilterChips() {
    const cityContainer = document.getElementById('notes-filter-cities');
    const tagContainer = document.getElementById('notes-filter-tags');
    if (!cityContainer || !tagContainer) return;

    // Города: уникальные из заметок пользователя (id + name), плюс весь каталог как fallback
    const allCities = (window.VIETNAM_DATA?.cities) || [];

    // Собираем уникальные города из заметок
    const userCityMap = new Map();   // ключ = id, значение = {id, name, count}
    notesCache.forEach(n => {
        if (n.city) {
            const id = 'id:' + n.city;
            const cur = userCityMap.get(id);
            if (cur) cur.count++;
            else userCityMap.set(id, { id, name: getCityName(n.city, n.cityName), count: 1 });
        } else if (n.cityName) {
            const id = 'name:' + n.cityName;
            const cur = userCityMap.get(id);
            if (cur) cur.count++;
            else userCityMap.set(id, { id, name: n.cityName, count: 1 });
        }
    });
    const userCities = Array.from(userCityMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));

    // Если в заметках меньше 6 уникальных городов — дополним каталогом
    const catalogCities = allCities
        .filter(c => !userCities.find(uc => uc.id === 'id:' + c.id))
        .map(c => ({ id: 'id:' + c.id, name: c.name, count: 0 }));

    const allCityChips = [...userCities, ...catalogCities];

    cityContainer.innerHTML = `
        <button class="filter-chip ${!activeCityFilter ? 'active' : ''}" onclick="clearCityFilter()">📍 Все города</button>
        ${allCityChips.map(c => `
            <button class="filter-chip ${activeCityFilter === c.id ? 'active' : ''}" onclick="filterByCity('${escapeAttr(c.id)}')" title="${escapeAttr(c.name)}${c.count ? ` • ${c.count} заметок` : ''}">📍 ${escapeHtml(c.name)}${c.count ? ` <span class="filter-chip-count">${c.count}</span>` : ''}</button>
        `).join('')}
    `;

    // Теги: уникальные из всех заметок
    const tagCounts = {};
    notesCache.forEach(n => (n.tags || []).forEach(t => {
        const key = t.toLowerCase();
        tagCounts[key] = (tagCounts[key] || 0) + 1;
    }));
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    if (sortedTags.length === 0) {
        tagContainer.innerHTML = '<span class="filter-hint">Теги появятся, когда вы их добавите к заметкам.</span>';
    } else {
        tagContainer.innerHTML = sortedTags.map(([tag, count]) => `
            <button class="filter-chip tag-chip ${activeTagFilter === tag ? 'active' : ''}" onclick="filterByTag('${escapeAttr(tag)}')">
                #${escapeHtml(tag)} <span class="filter-chip-count">${count}</span>
            </button>
        `).join('');
    }
}

function clearCityFilter() {
    activeCityFilter = null;
    renderFilterChips();
    renderNotesList();
}

function filterByCity(cityId) {
    activeCityFilter = activeCityFilter === cityId ? null : cityId;
    renderFilterChips();
    renderNotesList();
}

function filterByTag(tag) {
    activeTagFilter = activeTagFilter === tag ? null : tag;
    renderFilterChips();
    renderNotesList();
}

// -------------------- рендер: редактор --------------------

function renderNoteEditor(noteOrId) {
    const editor = document.getElementById('notes-editor');
    if (!editor) return;

    // noteOrId может быть:
    //   - null/undefined        → пустое состояние
    //   - строка (id существующей заметки) → редактирование
    //   - объект { __isNew: true }        → создание новой
    if (noteOrId && typeof noteOrId === 'object' && noteOrId.__isNew) {
        currentDraft = 'new';
        editor.innerHTML = renderEditorForm(noteOrId);
        updateGeocodeButtonVisibility();
        return;
    }

    if (typeof noteOrId === 'string' && noteOrId) {
        const note = notesCache.find(n => n.id === noteOrId);
        if (!note) {
            currentDraft = null;
            editor.innerHTML = renderEmptyEditor();
            return;
        }
        currentDraft = noteOrId;
        editor.innerHTML = renderEditorForm(note);
        updateGeocodeButtonVisibility();
        return;
    }

    currentDraft = null;
    editor.innerHTML = renderEmptyEditor();
}

function renderEmptyEditor() {
    return `
        <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>Выберите категорию слева и нажмите «➕ Добавить заметку»,<br>или кликните по существующей заметке, чтобы отредактировать.</p>
        </div>
    `;
}

function renderEditorForm(note) {
    const isNew = !note || note.__isNew;
    const n = isNew ? {
        id: '',
        title: '',
        body: '',
        category: activeCategory || 'other',
        subcategory: '',
        tags: [],
        city: '',
        address: '',
        coords: null
    } : note;

    const cities = (window.VIETNAM_DATA?.cities) || [];
    const subs = getAllSubcategories(n.category);
    const cat = getCategoryById(n.category);

    return `
        <div class="notes-editor-form">
            <div class="notes-editor-header">
                <input type="text" id="note-title" class="note-title-input" placeholder="Название заметки (например: Стоматология Vinmec)" value="${escapeAttr(n.title || '')}" />
            </div>

            <div class="notes-form-grid">
                <div class="notes-form-row">
                    <label>Категория</label>
                    <select id="note-category" onchange="onNoteCategoryChange()">
                        ${getAllCategories().map(c => `
                            <option value="${escapeAttr(c.id)}" ${c.id === n.category ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="notes-form-row">
                    <label>Подкатегория</label>
                    <select id="note-subcategory">
                        <option value="">— нет —</option>
                        ${subs.map(s => `
                            <option value="${escapeAttr(s.id)}" ${s.id === n.subcategory ? 'selected' : ''}>${escapeHtml(s.name)}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="notes-form-row">
                    <label>Город <span class="hint">(можно ввести свой)</span></label>
                    <input type="text" id="note-city" list="note-city-list" placeholder="Начните вводить — Ханой, Хошимин..." value="${escapeAttr(getCityName(n.city) || n.city || '')}" autocomplete="off" />
                    <datalist id="note-city-list">
                        ${cities.map(c => `
                            <option value="${escapeAttr(c.name)}" data-id="${escapeAttr(c.id)}"></option>
                        `).join('')}
                    </datalist>
                </div>
            </div>

            <div class="notes-form-row">
                <label>Теги <span class="hint">(Enter или запятая — добавить)</span></label>
                <div class="note-tags-input">
                    <div class="note-tags-list" id="note-tags-list">
                        ${(n.tags || []).map(t => `
                            <span class="note-tag-chip removable">#${escapeHtml(t)} <span class="note-tag-remove" onclick="removeNoteTag('${escapeAttr(t)}')">✕</span></span>
                        `).join('')}
                    </div>
                    <input type="text" id="note-tag-input" placeholder="добавить тег…" onkeydown="onNoteTagInputKey(event)" onblur="onNoteTagInputBlur()" />
                </div>
            </div>

            <div class="notes-form-row">
                <label>Адрес</label>
                <div class="note-address-row">
                    <input type="text" id="note-address" placeholder="Точный адрес или ориентир" value="${escapeAttr(n.address || '')}" />
                    <button type="button" class="btn btn-sm btn-secondary" onclick="startNotePicker()" title="Кликните на карте в нужном месте">📍 На карте</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="note-geocode-btn" onclick="geocodeNoteAddress()" style="display:none;">🔍 Найти</button>
                </div>
                <div class="note-coords-display" id="note-coords-display">
                    ${n.coords ? `✅ Точка на карте: ${n.coords[0].toFixed(5)}, ${n.coords[1].toFixed(5)} <button type="button" class="link-btn" onclick="clearNoteCoords()">снять</button>` : 'Точка не выбрана'}
                </div>
            </div>

            <div class="notes-form-row">
                <label>Текст заметки</label>
                <textarea id="note-body" rows="8" placeholder="Подробности: цены, контакты, рекомендации, что понравилось/не понравилось…">${escapeHtml(n.body || '')}</textarea>
            </div>

            <div class="notes-editor-actions">
                <button type="button" class="btn btn-primary" onclick="saveNoteDraft()">💾 Сохранить</button>
                ${!isNew && n.coords ? `<button type="button" class="btn btn-secondary" onclick="focusOnNote('${escapeAttr(n.id)}')">🗺️ На карте</button>` : ''}
                ${!isNew ? `<button type="button" class="btn btn-danger" onclick="deleteNoteConfirm('${escapeAttr(n.id)}')">🗑️ Удалить</button>` : ''}
                <button type="button" class="btn btn-secondary" onclick="renderNoteEditor(null)">✕ Отмена</button>
            </div>
        </div>
    `;
}

function getDraftNote() {
    const tags = Array.from(document.querySelectorAll('#note-tags-list .note-tag-chip'))
        .map(el => el.dataset.tag)
        .filter(Boolean);
    return {
        title: document.getElementById('note-title')?.value.trim() || '',
        category: document.getElementById('note-category')?.value || 'other',
        subcategory: document.getElementById('note-subcategory')?.value || '',
        city: resolveCityValue(document.getElementById('note-city')?.value || ''),
        cityName: document.getElementById('note-city')?.value.trim() || '',
        address: document.getElementById('note-address')?.value.trim() || '',
        body: document.getElementById('note-body')?.value.trim() || '',
        tags
    };
}

// Преобразует введённое название города в id из VIETNAM_DATA, если совпало.
// Если не совпало — возвращает null (свободный ввод).
function resolveCityValue(input) {
    const v = (input || '').trim();
    if (!v) return null;
    const cities = (window.VIETNAM_DATA?.cities) || [];
    // точное совпадение по name (ru/en-варианту)
    const exact = cities.find(c =>
        c.name.toLowerCase() === v.toLowerCase() ||
        (c.nameViet && c.nameViet.toLowerCase() === v.toLowerCase())
    );
    if (exact) return exact.id;
    // иначе сохраняем как свободный ввод (в отдельном поле cityName)
    return null;
}

function setDraftCoords(coords) {
    // вызывается из map.js после клика
    const display = document.getElementById('note-coords-display');
    if (!display) return;
    if (coords && Array.isArray(coords) && coords.length === 2) {
        // сохраняем во временный буфер, чтобы saveNoteDraft() подхватил
        window.__noteDraftCoords = coords;
        display.innerHTML = `✅ Точка на карте: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)} <button type="button" class="link-btn" onclick="clearNoteCoords()">снять</button>`;
        // переключаемся обратно на вкладку заметок
        if (typeof switchTab === 'function') switchTab('notes');
    }
}

function clearNoteCoords() {
    window.__noteDraftCoords = null;
    const display = document.getElementById('note-coords-display');
    if (display) display.innerHTML = 'Точка не выбрана';
}

// -------------------- действия: создать/сохранить/удалить --------------------

function startNewNote() {
    if (!activeCategory) activeCategory = 'other';
    renderNoteEditor({ __isNew: true });
    window.__noteDraftCoords = null;
    setTimeout(() => {
        const title = document.getElementById('note-title');
        if (title) title.focus();
    }, 50);
}

function openNoteDraft(noteId) {
    renderNoteEditor(noteId);
    // показываем/скрываем кнопку геокодинга в зависимости от ключа
    updateGeocodeButtonVisibility();
}

function onNoteCategoryChange() {
    const newCat = document.getElementById('note-category')?.value;
    if (newCat && newCat !== activeCategory) {
        activeCategory = newCat;
        // при смене категории сбрасываем подкатегорию
        const subSelect = document.getElementById('note-subcategory');
        if (subSelect) subSelect.value = '';
        // перестраиваем список подкатегорий
        const subs = getAllSubcategories(newCat);
        subSelect.innerHTML = `<option value="">— нет —</option>` + subs.map(s =>
            `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`
        ).join('');
    }
}

function onNoteTagInputKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const input = e.target;
        const value = input.value.trim().replace(/,$/, '').toLowerCase();
        if (value) addNoteTag(value);
        input.value = '';
    } else if (e.key === 'Backspace' && !e.target.value) {
        // удалить последний тег
        const tags = document.querySelectorAll('#note-tags-list .note-tag-chip');
        if (tags.length) tags[tags.length - 1].remove();
    }
}

function onNoteTagInputBlur() {
    const input = document.getElementById('note-tag-input');
    if (!input) return;
    const value = input.value.trim().toLowerCase();
    if (value) {
        addNoteTag(value);
        input.value = '';
    }
}

function addNoteTag(tag) {
    const clean = tag.toLowerCase().trim();
    if (!clean) return;
    const list = document.getElementById('note-tags-list');
    if (!list) return;
    if (Array.from(list.querySelectorAll('.note-tag-chip')).some(el => el.dataset.tag === clean)) return;
    const chip = document.createElement('span');
    chip.className = 'note-tag-chip removable';
    chip.dataset.tag = clean;
    chip.innerHTML = `#${escapeHtml(clean)} <span class="note-tag-remove" onclick="removeNoteTag('${escapeAttr(clean)}')">✕</span>`;
    list.appendChild(chip);
}

function removeNoteTag(tag) {
    const list = document.getElementById('note-tags-list');
    if (!list) return;
    const chip = Array.from(list.querySelectorAll('.note-tag-chip')).find(el => el.dataset.tag === tag);
    if (chip) chip.remove();
}

async function saveNoteDraft() {
    const data = getDraftNote();
    if (!data.title) {
        alert('Введите название заметки.');
        return;
    }
    if (!data.category) {
        alert('Выберите категорию.');
        return;
    }

    const draftCoords = window.__noteDraftCoords || null;

    if (currentDraft && currentDraft !== 'new') {
        // редактирование
        const idx = notesCache.findIndex(n => n.id === currentDraft);
        if (idx === -1) {
            alert('Заметка не найдена.');
            return;
        }
        notesCache[idx] = {
            ...notesCache[idx],
            ...data,
            coords: draftCoords || notesCache[idx].coords || null,
            updatedAt: Date.now()
        };
    } else {
        // создание
        const now = Date.now();
        const newNote = {
            id: 'note_' + now + '_' + Math.random().toString(36).slice(2, 8),
            ...data,
            coords: draftCoords,
            createdAt: now,
            updatedAt: now
        };
        notesCache.push(newNote);
    }

    const ok = await saveNotes(notesCache);
    if (!ok) {
        alert('Не удалось сохранить (нет связи с облаком). Заметка сохранена локально.');
    }
    window.__noteDraftCoords = null;
    await syncNoteMarkers();
    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);

    // подсветка "сохранено"
    flashSavedMessage();
}

function flashSavedMessage() {
    const editor = document.getElementById('notes-editor');
    if (!editor) return;
    const msg = document.createElement('div');
    msg.className = 'note-flash';
    msg.textContent = '✅ Сохранено';
    editor.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
}

async function deleteNoteConfirm(noteId) {
    if (!confirm('Удалить эту заметку?')) return;
    notesCache = notesCache.filter(n => n.id !== noteId);
    await saveNotes(notesCache);
    await syncNoteMarkers();
    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);
}

// -------------------- карта: показать точку и режим выбора --------------------

function focusOnNote(noteId) {
    const note = notesCache.find(n => n.id === noteId);
    if (!note) return;
    if (!note.coords) {
        alert('У этой заметки нет координат. Нажмите «📍 На карте» и выберите точку.');
        return;
    }
    if (typeof switchTab === 'function') switchTab('map');
    if (typeof window.focusOnUserNote === 'function') {
        setTimeout(() => window.focusOnUserNote(noteId), 150);
    }
}

function startNotePicker() {
    // переключаемся на карту и включаем режим выбора точки
    if (typeof window.setNotePickerMode === 'function') {
        window.setNotePickerMode(true, (coords) => {
            setDraftCoords(coords);
        });
    } else {
        alert('Карта ещё не инициализирована. Откройте вкладку карты и подождите.');
    }
}

async function syncNoteMarkers() {
    if (typeof window.renderUserNoteMarkers === 'function') {
        await window.renderUserNoteMarkers(notesCache);
    }
}

// -------------------- геокодинг (OpenRouteService) --------------------

async function geocodeNoteAddress() {
    const addr = document.getElementById('note-address')?.value.trim();
    if (!addr) {
        alert('Введите адрес для поиска.');
        return;
    }
    const settings = await getSettings();
    const apiKey = settings?.orsKey || '';
    if (!apiKey) {
        alert('Введите OpenRouteService API-ключ в разделе «Настройки», чтобы пользоваться геокодингом.');
        return;
    }
    const btn = document.getElementById('note-geocode-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Ищу…';
    }
    try {
        const url = `https://api.openrouteservice.org/v2/geocode/search?api_key=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(addr)}&size=1`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        const feat = (data.features || [])[0];
        if (!feat) {
            alert('Адрес не найден. Попробуйте переформулировать или выберите точку на карте.');
            return;
        }
        const [lng, lat] = feat.geometry.coordinates;
        setDraftCoords([lat, lng]);
    } catch (e) {
        alert('Ошибка геокодинга: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍 Найти';
        }
    }
}

function updateGeocodeButtonVisibility() {
    getSettings().then(s => {
        const btn = document.getElementById('note-geocode-btn');
        if (btn) btn.style.display = s?.orsKey ? 'inline-block' : 'none';
    });
}

// -------------------- пользовательские категории --------------------

function addCustomCategoryPrompt() {
    const name = prompt('Название новой категории:');
    if (!name || !name.trim()) return;
    const id = 'cat_' + Date.now().toString(36);
    customCategoriesCache.categories.push({ id, icon: '🗂️', name: name.trim() });
    saveNoteCategories(customCategoriesCache);
    renderNotesTree();
    renderNotesList();
}

function addCustomSubcategoryPrompt(parentId) {
    const name = prompt('Название новой подкатегории:');
    if (!name || !name.trim()) return;
    const id = 'sub_' + Date.now().toString(36);
    customCategoriesCache.subcategories.push({ id, parentId, name: name.trim() });
    saveNoteCategories(customCategoriesCache);
    renderNotesTree();
}

async function removeSubcategoryPrompt(categoryId, subId, noteCount) {
    const subs = getAllSubcategories(categoryId);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;

    // Определяем, встроенная или пользовательская
    const isCustom = customCategoriesCache.subcategories.some(s => s.id === subId);

    let msg;
    if (noteCount > 0) {
        msg = `В подкатегории «${sub.name}» есть ${noteCount} заметок.\n\nУдалить подкатегорию? Заметки останутся, но перейдут в категорию «${getCategoryById(categoryId)?.name}» без подкатегории.`;
    } else {
        msg = `Удалить подкатегорию «${sub.name}»?`;
    }
    if (!confirm(msg)) return;

    // 1. Если пользовательская — убираем из customCategories
    if (isCustom) {
        customCategoriesCache.subcategories = customCategoriesCache.subcategories.filter(s => s.id !== subId);
        await saveNoteCategories(customCategoriesCache);
    }

    // 2. Очищаем subcategory в заметках
    let changed = false;
    notesCache.forEach(n => {
        if (n.category === categoryId && n.subcategory === subId) {
            n.subcategory = '';
            n.updatedAt = Date.now();
            changed = true;
        }
    });
    if (changed) {
        await saveNotes(notesCache);
        await syncNoteMarkers();
    }

    // 3. Сбрасываем активный фильтр
    if (activeSubcategory === subId) activeSubcategory = null;

    renderNotesTree();
    renderNotesList();
    renderFilterChips();
}

// -------------------- helpers --------------------

function getCityName(cityIdOrName, cityName) {
    if (cityName && typeof cityName === 'string' && cityName.trim()) return cityName.trim();
    if (!cityIdOrName) return '';
    const cities = (window.VIETNAM_DATA?.cities) || [];
    // если это id
    const byId = cities.find(x => x.id === cityIdOrName);
    if (byId) return byId.name;
    // иначе это уже название
    return cityIdOrName;
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeAttr(text) {
    if (text == null) return '';
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// -------------------- экспорт/импорт (для совместимости с Settings) --------------------

function exportNotes() {
    const dataStr = JSON.stringify(notesCache, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietnam-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!Array.isArray(imported)) {
                    alert('Неверный формат: ожидается массив заметок.');
                    return;
                }
                notesCache = imported;
                await saveNotes(notesCache);
                await syncNoteMarkers();
                renderNotesTree();
                renderNotesList();
                renderFilterChips();
                renderNoteEditor(null);
                alert('Заметки импортированы успешно!');
            } catch (error) {
                alert('Ошибка импорта: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function clearNotes() {
    if (!confirm('Удалить ВСЕ заметки? Это действие нельзя отменить.')) return;
    notesCache = [];
    await saveNotes(notesCache);
    await syncNoteMarkers();
    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);
}

// -------------------- глобальный экспорт --------------------

window.initNotes = initNotes;
window.startNewNote = startNewNote;
window.openNoteDraft = openNoteDraft;
window.saveNoteDraft = saveNoteDraft;
window.deleteNoteConfirm = deleteNoteConfirm;
window.focusOnNote = focusOnNote;
window.startNotePicker = startNotePicker;
window.setDraftCoords = setDraftCoords;
window.clearNoteCoords = clearNoteCoords;
window.geocodeNoteAddress = geocodeNoteAddress;
window.addNoteTag = addNoteTag;
window.removeNoteTag = removeNoteTag;
window.onNoteTagInputKey = onNoteTagInputKey;
window.onNoteCategoryChange = onNoteCategoryChange;
window.toggleNoteCategory = toggleNoteCategory;
window.selectNoteCategory = selectNoteCategory;
window.selectNoteSubcategory = selectNoteSubcategory;
window.filterByCity = filterByCity;
window.filterByTag = filterByTag;
window.clearCityFilter = clearCityFilter;
window.filterBySubcategory = filterBySubcategory;
window.clearSubcategoryFilter = clearSubcategoryFilter;
window.onNoteTagInputBlur = onNoteTagInputBlur;
window.addCustomCategoryPrompt = addCustomCategoryPrompt;
window.addCustomSubcategoryPrompt = addCustomSubcategoryPrompt;
window.removeSubcategoryPrompt = removeSubcategoryPrompt;
window.renderNotesTree = renderNotesTree;
window.renderNotesList = renderNotesList;
window.renderFilterChips = renderFilterChips;
window.exportNotes = exportNotes;
window.importNotes = importNotes;
window.clearNotes = clearNotes;
window.getAllCategories = getAllCategories;
window.__getNotesCache = () => notesCache;
