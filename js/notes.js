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
let draftImages = [];             // фото/скриншоты редактируемой заметки (dataURL)

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
        // Chrome подставляет сохранённые данные профиля даже при autocomplete="off" —
        // принудительно чистим строку поиска после отложенного автозаполнения
        [100, 600, 2000].forEach(delay => setTimeout(() => {
            if (searchInput.value && document.activeElement !== searchInput) {
                searchInput.value = '';
                renderNotesList('');
            }
        }, delay));
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

    // «Все заметки» — отдельная запись в самом верху дерева
    const noFilters = !activeCategory && !activeSubcategory && !activeCityFilter && !activeTagFilter;
    const allEntryHtml = `
        <div class="notes-tree-category notes-tree-all ${noFilters ? 'active' : ''}">
            <div class="notes-tree-header" onclick="showAllNotes()">
                <span class="notes-tree-toggle"></span>
                <span class="notes-tree-icon">📋</span>
                <span class="notes-tree-name">Все заметки</span>
                <span class="notes-tree-count">${notesCache.length}</span>
            </div>
        </div>
    `;

    const html = allEntryHtml + getAllCategories().map(cat => {
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
                <div class="notes-tree-header" onclick="selectNoteCategory('${escapeAttr(cat.id)}')">
                    <span class="notes-tree-toggle" title="${isExpanded ? 'Свернуть' : 'Развернуть'}"
                          onclick="event.stopPropagation(); toggleNoteCategoryExpanded('${escapeAttr(cat.id)}')">${isExpanded ? '▾' : '▸'}</span>
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

// Свернуть/развернуть категорию, не меняя выбранную (клик по стрелке)
function toggleNoteCategoryExpanded(categoryId) {
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
    }
    persistNotesTreeState();
    renderNotesTree();
}

// Совместимость: старая функция теперь просто сворачивает/разворачивает
function toggleNoteCategory(categoryId) {
    toggleNoteCategoryExpanded(categoryId);
}

// Состояние дерева (какие категории раскрыты) запоминается локально
function persistNotesTreeState() {
    try {
        localStorage.setItem('vietnam_map_notes_tree_expanded', JSON.stringify([...expandedCategories]));
    } catch (e) { /* ignore */ }
}

(function loadNotesTreeState() {
    try {
        const raw = localStorage.getItem('vietnam_map_notes_tree_expanded');
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) expandedCategories = new Set(arr);
    } catch (e) { /* ignore */
    }
})();

function selectNoteCategory(categoryId) {
    activeCategory = categoryId;
    activeSubcategory = null;
    currentDraft = null;
    expandedCategories.add(categoryId);
    persistNotesTreeState();
    renderNotesTree();
    renderNotesList();
    renderNoteEditor(null);
}

function selectNoteSubcategory(categoryId, subId) {
    activeCategory = categoryId;
    activeSubcategory = subId;
    currentDraft = null;
    expandedCategories.add(categoryId);
    persistNotesTreeState();
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

    renderNotesAllBar();

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
                    : 'Пока нет заметок в этой категории. Нажмите «+ Добавить заметку».'}</p>
            </div>
        `;
        updateListVisibility();
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
                ${(n.images && n.images.length) ? `<div class="note-card-imgwrap"><img class="note-card-img" src="${n.images[0]}" alt=""><span class="note-card-imgcount">📷 ${n.images.length}</span></div>` : ''}
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
    updateListVisibility();
}

// -------------------- рендер: чипсы фильтров --------------------

// Индекс хэштегов по всем заметкам: { тег: количество }
function collectExistingTagCounts() {
    const tagCounts = {};
    notesCache.forEach(n => (n.tags || []).forEach(t => {
        const key = (t || '').trim().toLowerCase();
        if (key) tagCounts[key] = (tagCounts[key] || 0) + 1;
    }));
    return tagCounts;
}

// Список уже существующих тегов (для выпадающего списка в редакторе)
function getAllExistingTags() {
    return Object.keys(collectExistingTagCounts()).sort((a, b) => a.localeCompare(b, 'ru'));
}

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

// -------------------- все заметки: сводка + хэштеги --------------------

function renderNotesAllBar() {
    const chip = document.getElementById('notes-all-chip');
    const countEl = document.getElementById('notes-all-count');
    const hint = document.getElementById('notes-all-hint');
    const clearBtn = document.getElementById('notes-all-clear');
    const tagsContainer = document.getElementById('notes-all-tags');
    if (!countEl || !tagsContainer) return;

    countEl.textContent = notesCache.length;

    const noFilters = !activeCategory && !activeSubcategory && !activeCityFilter && !activeTagFilter;
    if (chip) chip.classList.toggle('active', noFilters);

    const hasFilters = activeCategory || activeSubcategory || activeCityFilter || activeTagFilter;
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilters);
    if (hint) {
        hint.textContent = activeTagFilter
            ? `Фильтр по тегу: #${activeTagFilter}`
            : (hasFilters ? '' : 'кликните #хэштег — покажем все заметки с ним');
    }

    // Индекс хэштегов по всем заметкам без разбора на категории
    const tagCounts = collectExistingTagCounts();
    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));

    if (sorted.length === 0) {
        tagsContainer.innerHTML = '<span class="filter-hint">Теги появятся, когда вы их добавите к заметкам.</span>';
    } else {
        tagsContainer.innerHTML = sorted.map(([tag, count]) => `
            <button class="filter-chip tag-chip ${activeTagFilter === tag ? 'active' : ''}" onclick="searchTagAcrossNotes('${escapeAttr(tag)}')">
                #${escapeHtml(tag)} <span class="filter-chip-count">${count}</span>
            </button>
        `).join('');
    }
}

// «Все заметки»: сброс категории/подкатегории/городов/тегов — весь список
function showAllNotes() {
    activeCategory = null;
    activeSubcategory = null;
    activeCityFilter = null;
    activeTagFilter = null;
    currentDraft = null;
    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);
}

// Поиск хэштега по всем заметкам, минуя выбранную категорию
function searchTagAcrossNotes(tag) {
    activeTagFilter = activeTagFilter === tag ? null : tag;
    activeCategory = null;
    activeSubcategory = null;
    currentDraft = null;
    renderNotesTree();
    renderNotesList();
    renderFilterChips();
    renderNoteEditor(null);
}

function clearAllNoteFilters() {
    showAllNotes();
}

// -------------------- рендер: редактор --------------------

// пока открыт редактор — прячем список карточек (иначе overflow карточек
// наползает на форму); без редактора плашку-подсказку показываем только
// когда карточки не видны
function updateListVisibility() {
    const listEl = document.getElementById('notes-list');
    const subbarEl = document.getElementById('notes-subbar');
    const filterBarEl = document.getElementById('notes-filter-bar');
    const editorEl = document.getElementById('notes-editor');
    const editing = !!currentDraft;
    if (listEl) listEl.style.display = editing ? 'none' : '';
    // видимость subbar в обычном режиме управляет renderNotesList
    if (subbarEl && editing) subbarEl.style.display = 'none';
    // панель фильтров (теги/города) не нужна, пока открыт редактор
    if (filterBarEl) filterBarEl.style.display = editing ? 'none' : '';
    if (!editorEl) return;
    if (editing) {
        editorEl.style.display = '';
        return;
    }
    const listVisible = listEl && listEl.style.display !== 'none' && listEl.children.length > 0;
    editorEl.style.display = listVisible ? 'none' : '';
}

function renderNoteEditor(noteOrId) {
    const editor = document.getElementById('notes-editor');
    if (!editor) return;

    // noteOrId может быть:
    //   - null/undefined        → пустое состояние
    //   - строка (id существующей заметки) → редактирование
    //   - объект { __isNew: true }        → создание новой
    if (noteOrId && typeof noteOrId === 'object' && noteOrId.__isNew) {
        currentDraft = 'new';
        draftImages = [];
        editor.innerHTML = renderEditorForm(noteOrId);
        updateListVisibility();
        renderNoteImages();
        updateGeocodeButtonVisibility();
        return;
    }

    if (typeof noteOrId === 'string' && noteOrId) {
        const note = notesCache.find(n => n.id === noteOrId);
        if (!note) {
            currentDraft = null;
            draftImages = [];
            editor.innerHTML = renderEmptyEditor();
            updateListVisibility();
            return;
        }
        currentDraft = noteOrId;
        draftImages = Array.isArray(note.images) ? [...note.images] : [];
        editor.innerHTML = renderEditorForm(note);
        updateListVisibility();
        renderNoteImages();
        updateGeocodeButtonVisibility();
        return;
    }

    currentDraft = null;
    draftImages = [];
    editor.innerHTML = renderEmptyEditor();
    updateListVisibility();
}

function renderEmptyEditor() {
    return `
        <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>Выберите категорию слева и нажмите «+ Добавить заметку»,<br>или кликните по существующей заметке, чтобы отредактировать.</p>
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
        coords: null,
        pinType: null
    } : note;

    const cities = (window.VIETNAM_DATA?.cities) || [];
    const subs = getAllSubcategories(n.category);
    const cat = getCategoryById(n.category);
    const pinTypes = (window.PIN_TYPES) || {};

    return `
        <div class="notes-editor-form">
            <div class="notes-editor-header">
                <input type="text" id="note-title" class="note-title-input" placeholder="Название заметки (например: Стоматология Vinmec)" value="${escapeAttr(n.title || '')}" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" />
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
                    <input type="text" id="note-city" list="note-city-list" placeholder="Например: hanoi" value="${escapeAttr(n.city || '')}" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" />
                    <datalist id="note-city-list">
                        ${cities.map(c => `
                            <option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>
                        `).join('')}
                    </datalist>
                </div>
            </div>

            <div class="notes-form-grid notes-form-grid-2">
                <div class="notes-form-row">
                    <label>Теги <span class="hint">(Enter или запятая)</span></label>
                    <div class="note-tags-input">
                        <div class="note-tags-list" id="note-tags-list">
                            ${(n.tags || []).map(t => `
                                <span class="note-tag-chip removable">#${escapeHtml(t)} <span class="note-tag-remove" onclick="removeNoteTag('${escapeAttr(t)}')">✕</span></span>
                            `).join('')}
                        </div>
                        <input type="text" id="note-tag-input" list="note-existing-tags" placeholder="добавить тег…" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" onkeydown="onNoteTagInputKey(event)" onblur="onNoteTagInputBlur()" />
                        <datalist id="note-existing-tags">
                            ${getAllExistingTags().map(t => `<option value="${escapeAttr(t)}"></option>`).join('')}
                        </datalist>
                    </div>
                </div>

                <div class="notes-form-row">
                    <label>Адрес</label>
                    <div class="note-address-row">
                        <input type="text" id="note-address" placeholder="ориентир" value="${escapeAttr(n.address || '')}" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" />
                        <button type="button" class="btn btn-sm btn-secondary" onclick="startNotePicker()" title="Кликните на карте в нужном месте">📍 На карте</button>
                        <button type="button" class="btn btn-sm btn-secondary" id="note-geocode-btn" onclick="geocodeNoteAddress()" style="display:none;">🔍</button>
                    </div>
                    <div class="note-coords-display" id="note-coords-display">
                        ${n.coords ? `✅ Точка на карте: ${n.coords[0].toFixed(5)}, ${n.coords[1].toFixed(5)} <button type="button" class="link-btn" onclick="clearNoteCoords()">снять</button>` : 'Точка не выбрана'}
                    </div>
                </div>
            </div>

            <div class="notes-form-row">
                <label>Текст заметки</label>
                <textarea id="note-body" rows="14" placeholder="Подробности: цены, контакты, рекомендации, что понравилось/не понравилось…">${escapeHtml(n.body || '')}</textarea>
            </div>

            <details class="note-extra" ${n.pinType ? 'open' : ''}>
                <summary>📍 Метка на карте</summary>
                <div class="pin-type-picker pin-type-picker-editor">
                    <button type="button" class="pin-type-btn pin-type-none ${(!n.pinType) ? 'active' : ''}" data-type="" onclick="setEditorPinType('')" title="Без метки" aria-label="Без метки">⊘</button>
                    ${Object.entries(pinTypes || {}).map(([type, meta]) => `
                        <button type="button" class="pin-type-btn pin-type-${type} ${n.pinType === type ? 'active' : ''}" data-type="${type}" onclick="setEditorPinType('${type}')" title="${escapeAttr(meta.name)}" aria-label="${escapeAttr(meta.name)}">${meta.icon}</button>
                    `).join('')}
                </div>
            </details>

            <div class="notes-form-row">
                <label>Фото и скриншоты <span class="hint">(Ctrl+V вставит из буфера; до ${NOTE_IMAGES_LIMIT} шт., сжимаются до 1200px)</span></label>
                <div class="note-images-drop" id="note-images-drop"
                     onclick="document.getElementById('note-image-input').click()"
                     ondragover="event.preventDefault(); this.classList.add('drag')"
                     ondragleave="this.classList.remove('drag')"
                     ondrop="event.preventDefault(); this.classList.remove('drag'); onNoteImageDrop(event)">
                    <span>📷 Перетащите картинки сюда или нажмите, чтобы выбрать</span>
                    <input type="file" id="note-image-input" accept="image/*" multiple hidden onchange="onNoteImageInput(this)">
                </div>
                <div class="note-images-list" id="note-images-list"></div>
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

// -------------------- фото и скриншоты --------------------

const NOTE_IMAGES_LIMIT = 10;

// Миниатюры в редакторе
function renderNoteImages() {
    const list = document.getElementById('note-images-list');
    if (!list) return;
    list.innerHTML = draftImages.map((src, i) => `
        <div class="note-image-thumb">
            <img src="${src}" alt="Фото ${i + 1}" onclick="previewNoteImage(${i})">
            <span class="note-image-remove" title="Удалить фото" onclick="removeNoteImage(${i})">✕</span>
        </div>
    `).join('') + (draftImages.length ? '' : '<span class="filter-hint">Фото пока не добавлены</span>');
}

function addNoteImage(dataUrl) {
    if (!currentDraft) return;
    if (draftImages.length >= NOTE_IMAGES_LIMIT) {
        alert(`Максимум ${NOTE_IMAGES_LIMIT} фото на заметку.`);
        return;
    }
    draftImages.push(dataUrl);
    renderNoteImages();

    // Предупреждение, если заметка с фото становится слишком большой для облака (лимит D1 ~2 МБ на запись)
    const totalKb = draftImages.reduce((sum, s) => sum + s.length, 0) / 1024;
    if (totalKb > 1400) {
        alert('Много фото: заметка стала очень большой и может не синхронизироваться с облаком.');
    }
}

function removeNoteImage(index) {
    draftImages.splice(index, 1);
    renderNoteImages();
}

// Просмотр на весь экран (общий лайтбокс)
function previewNoteImage(index) {
    const lightbox = document.getElementById('route-lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lightbox || !img) return;
    img.src = draftImages[index];
    lightbox.classList.remove('hidden');
}

// Файлы из input / drag&drop / буфера обмена
function onNoteImageInput(input) {
    handleNoteImageFiles(input.files || []);
    input.value = '';
}

function onNoteImageDrop(event) {
    handleNoteImageFiles(event.dataTransfer?.files || []);
}

async function handleNoteImageFiles(files) {
    if (!currentDraft) return;
    for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        try {
            addNoteImage(await compressImageToDataUrl(file));
        } catch (e) {
            console.warn('Image compress failed:', e);
            alert('Не удалось обработать изображение: ' + file.name);
        }
        if (draftImages.length >= NOTE_IMAGES_LIMIT) break;
    }
}

// Сжатие: максимум 1200px по большей стороне, JPEG
function compressImageToDataUrl(file, maxSide = 1200, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                const width = Math.max(1, Math.round(img.width * scale));
                const height = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                reject(e);
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Не удалось прочитать изображение'));
        };
        img.src = url;
    });
}

// Вставка скриншота из буфера (Ctrl+V) в открытый редактор
document.addEventListener('paste', (e) => {
    if (!currentDraft) return;
    const items = e.clipboardData?.items || [];
    const files = [];
    for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) files.push(file);
        }
    }
    if (files.length) {
        e.preventDefault();
        handleNoteImageFiles(files);
    }
});

function getDraftNote() {
    const tags = Array.from(document.querySelectorAll('#note-tags-list .note-tag-chip'))
        .map(el => el.dataset.tag)
        .filter(Boolean);
    const pinTypeVal = document.querySelector('.pin-type-picker-editor .pin-type-btn.active')?.dataset.type || '';
    const cityInput = document.getElementById('note-city')?.value.trim() || '';
    const cityId = resolveCityValue(cityInput);
    // если город распознан — cityName держим человекочитаемым, иначе свободный ввод
    const cityName = cityId ? (getCityName(cityId) || cityInput) : cityInput;
    return {
        title: document.getElementById('note-title')?.value.trim() || '',
        category: document.getElementById('note-category')?.value || 'other',
        subcategory: document.getElementById('note-subcategory')?.value || '',
        city: cityId,
        cityName,
        address: document.getElementById('note-address')?.value.trim() || '',
        body: document.getElementById('note-body')?.value.trim() || '',
        tags,
        pinType: pinTypeVal || null,
        images: [...draftImages]
    };
}

// Устанавливает активный тип метки в редакторе заметки
window.setEditorPinType = function(type) {
    document.querySelectorAll('.pin-type-picker-editor .pin-type-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.type || '') === (type || ''));
    });
};

// Преобразует введённое название города в id из VIETNAM_DATA, если совпало.
// Если не совпало — возвращает null (свободный ввод).
function resolveCityValue(input) {
    const v = (input || '').trim();
    if (!v) return null;
    const cities = (window.VIETNAM_DATA?.cities) || [];
    // точное совпадение по id (латиница), name (ru) и en-варианту
    const exact = cities.find(c =>
        c.id.toLowerCase() === v.toLowerCase() ||
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
    if (typeof window.setNotePickerMode !== 'function') {
        alert('Карта ещё не инициализирована. Откройте вкладку карты и подождите.');
        return;
    }
    if (typeof switchTab === 'function') {
        switchTab('map');
    }
    // включаем режим выбора с задержкой, чтобы карта успела отрисоваться
    setTimeout(() => {
        window.setNotePickerMode(true, (coords) => {
            setDraftCoords(coords);
        });
    }, 250);
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
window.toggleNoteCategoryExpanded = toggleNoteCategoryExpanded;
window.selectNoteCategory = selectNoteCategory;
window.selectNoteSubcategory = selectNoteSubcategory;
window.filterByCity = filterByCity;
window.filterByTag = filterByTag;
window.clearCityFilter = clearCityFilter;
window.filterBySubcategory = filterBySubcategory;
window.clearSubcategoryFilter = clearSubcategoryFilter;
window.removeNoteImage = removeNoteImage;
window.previewNoteImage = previewNoteImage;
window.onNoteImageInput = onNoteImageInput;
window.onNoteImageDrop = onNoteImageDrop;
window.showAllNotes = showAllNotes;
window.searchTagAcrossNotes = searchTagAcrossNotes;
window.clearAllNoteFilters = clearAllNoteFilters;
window.onNoteTagInputBlur = onNoteTagInputBlur;
window.addCustomCategoryPrompt = addCustomCategoryPrompt;
window.addCustomSubcategoryPrompt = addCustomSubcategoryPrompt;
window.removeSubcategoryPrompt = removeSubcategoryPrompt;
window.renderNotesTree = renderNotesTree;
window.renderNotesList = renderNotesList;

// Позволяет другим модулям (map.js) синхронизировать кэш заметок
// после изменения данных (создание/удаление метки через карту).
// Обновляет DOM-дерево и список, чтобы новая метка сразу была видна.
window.__syncNotesCache = async function(newNotes) {
    if (Array.isArray(newNotes)) notesCache = newNotes;
    if (typeof window.renderNotesTree === 'function') window.renderNotesTree();
    if (typeof window.renderNotesList === 'function') window.renderNotesList();
    if (typeof renderFilterChips === 'function') renderFilterChips();
};
window.renderFilterChips = renderFilterChips;
window.exportNotes = exportNotes;
window.importNotes = importNotes;
window.clearNotes = clearNotes;
window.getAllCategories = getAllCategories;
window.__getNotesCache = () => notesCache;
