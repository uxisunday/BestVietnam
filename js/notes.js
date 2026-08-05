// ============================================
// ЗАМЕТКИ: сохранение в localStorage
// ============================================

const NOTES_STORAGE_KEY = 'vietnam_map_notes';

function initNotes() {
    renderNotesList();

    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterNotesList(e.target.value);
        });
    }
}

// getNotes/saveNotes/getNoteText/setNoteText теперь определены в js/sync.js
// Эти fallback-функции оставлены для обратной совместимости
function __localGetNotes() {
    try {
        const saved = localStorage.getItem(NOTES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.error('Notes load error:', error);
        return {};
    }
}

function __localSaveNotes(notes) {
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error('Notes save error:', error);
    }
}

async function getNoteText(itemId) {
    const notes = await getNotes();
    return notes[itemId] || '';
}

async function setNoteText(itemId, text) {
    const notes = await getNotes();
    if (text.trim()) {
        notes[itemId] = text.trim();
    } else {
        delete notes[itemId];
    }
    await saveNotes(notes);
    renderNotesList();
}

async function renderNotesList() {
    const list = document.getElementById('notes-list');
    if (!list) return;

    const notes = await getNotes();
    const allItems = getAllNoteItems();

    // Сортируем: сначала с заметками, потом без
    const sortedItems = [...allItems].sort((a, b) => {
        const hasA = !!notes[a.id];
        const hasB = !!notes[b.id];
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        return a.name.localeCompare(b.name, 'ru');
    });

    list.innerHTML = sortedItems.map(item => {
        const noteText = notes[item.id] || '';
        const hasNote = noteText.length > 0;
        const preview = hasNote ? noteText.substring(0, 50) + (noteText.length > 50 ? '...' : '') : 'Нет заметок';

        return `
            <div class="notes-list-item ${hasNote ? 'has-note' : ''}" data-id="${item.id}" onclick="selectNoteItem('${item.id}')">
                <div style="font-weight: 600; margin-bottom: 4px;">${item.name} <span style="color: var(--text-secondary); font-size: 12px;">(${item.nameViet})</span></div>
                <div class="note-preview">${hasNote ? '📝 ' + preview : 'Нажмите, чтобы добавить заметку'}</div>
            </div>
        `;
    }).join('');
}

function getAllNoteItems() {
    return [
        ...VIETNAM_DATA.cities,
        ...VIETNAM_DATA.attractions,
        ...VIETNAM_DATA.beaches,
        ...VIETNAM_DATA.transport
    ];
}

async function filterNotesList(query) {
    const items = document.querySelectorAll('.notes-list-item');
    const lowerQuery = query.toLowerCase();
    const notes = await getNotes();

    items.forEach(el => {
        const id = el.dataset.id;
        const item = findItemById(id);
        if (!item) return;

        const noteText = (notes[id] || '').toLowerCase();
        const match = item.name.toLowerCase().includes(lowerQuery) ||
                      item.nameViet.toLowerCase().includes(lowerQuery) ||
                      noteText.includes(lowerQuery);
        el.style.display = match ? 'block' : 'none';
    });
}

async function selectNoteItem(itemId) {
    const item = findItemById(itemId);
    if (!item) return;

    document.querySelectorAll('.notes-list-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.notes-list-item[data-id="${itemId}"]`);
    if (activeEl) activeEl.classList.add('active');

    const editor = document.getElementById('notes-editor');
    if (!editor) return;

    const currentNote = await getNoteText(itemId);

    editor.innerHTML = `
        <div class="notes-editor-form">
            <h2 style="margin-bottom: 8px;">${item.name} <span style="color: var(--text-secondary); font-size: 16px;">(${item.nameViet})</span></h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 13px;">${item.description || ''}</p>

            <label for="note-text">Ваша заметка:</label>
            <textarea id="note-text" placeholder="Напишите свои впечатления, планы, советы...">${escapeHtml(currentNote)}</textarea>

            <button class="btn btn-primary" onclick="saveNoteFor('${itemId}')">💾 Сохранить заметку</button>
            <button class="btn btn-secondary" onclick="deleteNoteFor('${itemId}')">🗑️ Удалить</button>
            <button class="btn btn-secondary" onclick="showOnMap('${itemId}')">🗺️ Показать на карте</button>
        </div>
    `;
}

async function saveNoteFor(itemId) {
    const textarea = document.getElementById('note-text');
    if (!textarea) return;

    await setNoteText(itemId, textarea.value);

    // Показать подтверждение
    const editor = document.getElementById('notes-editor');
    const confirmMsg = document.createElement('div');
    confirmMsg.textContent = '✅ Заметка сохранена';
    confirmMsg.style.cssText = 'color: var(--success); margin-top: 12px; font-weight: 600;';
    editor.appendChild(confirmMsg);

    setTimeout(() => confirmMsg.remove(), 2000);
}

async function deleteNoteFor(itemId) {
    if (!confirm('Удалить заметку?')) return;

    await setNoteText(itemId, '');
    renderNotesList();

    const editor = document.getElementById('notes-editor');
    editor.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>Заметка удалена. Выберите другой город.</p>
        </div>
    `;
}

function showOnMap(itemId) {
    switchTab('map');
    const item = findItemById(itemId);
    if (item && map) {
        map.setView(item.coords, 12);
        // Найти маркер и открыть popup
        Object.values(markers).flat().forEach(marker => {
            if (marker.itemId === itemId) {
                marker.openPopup();
            }
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Экспорт/импорт заметок
function exportNotes() {
    getNotes().then(notes => {
        const dataStr = JSON.stringify(notes, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `vietnam-notes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
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
                if (typeof imported === 'object') {
                    await saveNotes(imported);
                    renderNotesList();
                    alert('Заметки импортированы успешно!');
                }
            } catch (error) {
                alert('Ошибка импорта: неверный формат файла');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

async function clearNotes() {
    if (!confirm('Удалить ВСЕ заметки? Это действие нельзя отменить.')) return;
    await saveNotes({});
    renderNotesList();
    document.getElementById('notes-editor').innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>Все заметки очищены.</p>
        </div>
    `;
}
