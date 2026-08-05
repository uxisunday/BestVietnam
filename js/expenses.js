// ============================================
// ТРАТЫ И БЮДЖЕТ
// ============================================

const EXPENSES_STORAGE_KEY = 'vietnam_map_expenses';
const BUDGET_STORAGE_KEY = 'vietnam_map_budget_rub';

const RATE_API_URL = 'https://open.er-api.com/v6/latest/RUB';
const RATE_CACHE_KEY = 'vietnam_map_vnd_rate';
const RATE_CACHE_TIME_KEY = 'vietnam_map_vnd_rate_time';
const DEFAULT_VND_PER_RUB = 280;
let currentVndPerRub = DEFAULT_VND_PER_RUB;

const EXPENSE_CATEGORIES = {
    food: { label: '🍽️ Еда', color: '#facc15' },
    accommodation: { label: '🏠 Жильё', color: '#6b8aff' },
    transport: { label: '🚌 Транспорт', color: '#22d3ee' },
    flights: { label: '✈️ Перелёты', color: '#a78bfa' },
    entertainment: { label: '🎭 Развлечения', color: '#f472b6' },
    shopping: { label: '🛍️ Шопинг', color: '#fb923c' },
    health: { label: '🏥 Медицина', color: '#4ade80' },
    visa: { label: '🛂 Визы', color: '#94a3b8' },
    other: { label: '📦 Другое', color: '#a99bb8' }
};

const DEFAULT_BUDGET_RUB = 600000;

async function initExpenses() {
    // Загрузить актуальный курс VND/RUB
    loadExchangeRate();

    // Установить сегодняшнюю дату по умолчанию
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Обработчик формы
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addExpense();
        });
    }

    await updateBudgetUI(true);
    await updateExpensesUI();
}

async function loadExchangeRate() {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    const cachedTime = localStorage.getItem(RATE_CACHE_TIME_KEY);
    const now = Date.now();

    if (cached && cachedTime && (now - parseInt(cachedTime)) < 24 * 60 * 60 * 1000) {
        currentVndPerRub = parseFloat(cached);
        updateRateNote();
        updateBudgetUI();
        return;
    }

    try {
        const response = await fetch(RATE_API_URL);
        const data = await response.json();
        if (data && data.rates && data.rates.VND) {
            currentVndPerRub = parseFloat(data.rates.VND);
            localStorage.setItem(RATE_CACHE_KEY, currentVndPerRub.toString());
            localStorage.setItem(RATE_CACHE_TIME_KEY, now.toString());
        }
    } catch (error) {
        console.error('Exchange rate fetch failed:', error);
    }

    updateRateNote();
    updateBudgetUI();
}

function getVndPerRub() {
    return currentVndPerRub || DEFAULT_VND_PER_RUB;
}

function vndToRub(vnd) {
    return vnd / getVndPerRub();
}

function formatRub(amount) {
    return '₽' + amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function formatVnd(amount) {
    return amount.toLocaleString('ru-RU') + ' ₫';
}

function updateRateNote() {
    const rate = getVndPerRub();
    document.querySelectorAll('.rate-note').forEach(el => {
        el.textContent = `Курс: 1 ₽ ≈ ${rate.toFixed(1)} ₫`;
    });
}

// getBudget/getExpenses/saveExpenses/setBudget теперь определены в js/sync.js
// Эти обёртки оставлены для обратной совместимости и fallback
function __localGetBudget() {
    try {
        const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
        return saved ? parseFloat(saved) : DEFAULT_BUDGET_RUB;
    } catch (error) {
        return DEFAULT_BUDGET_RUB;
    }
}

function __localGetExpenses() {
    try {
        const saved = localStorage.getItem(EXPENSES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Expenses load error:', error);
        return [];
    }
}

function __localSaveExpenses(expenses) {
    try {
        localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
        console.error('Expenses save error:', error);
    }
}

function addExpense() {
    const nameInput = document.getElementById('expense-name');
    const amountInput = document.getElementById('expense-amount');
    const categoryInput = document.getElementById('expense-category');
    const dateInput = document.getElementById('expense-date');
    const notesInput = document.getElementById('expense-notes');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const notes = notesInput.value.trim();

    if (!name || isNaN(amount) || amount <= 0 || !date) {
        alert('Пожалуйста, заполните все обязательные поля корректно');
        return;
    }

    const expenses = window.appData.expenses || [];
    expenses.push({
        id: 'exp-' + Date.now(),
        name,
        amount,
        category,
        date,
        notes,
        createdAt: new Date().toISOString()
    });

    window.appData.expenses = expenses;
    await saveExpenses(expenses);

    // Очистить форму
    nameInput.value = '';
    amountInput.value = '';
    notesInput.value = '';
    dateInput.valueAsDate = new Date();

    await updateBudgetUI(true);
    await updateExpensesUI();
}

async function deleteExpense(id) {
    if (!confirm('Удалить эту трату?')) return;

    const filtered = window.appData.expenses.filter(e => e.id !== id);
    window.appData.expenses = filtered;
    await saveExpenses(filtered);

    await updateBudgetUI(true);
    await updateExpensesUI();
}

async function getTotalSpent() {
    const expenses = await getExpenses();
    return expenses.reduce((sum, e) => sum + e.amount, 0);
}

async function getExpensesByCategory() {
    const result = {};
    const expenses = await getExpenses();
    expenses.forEach(e => {
        result[e.category] = (result[e.category] || 0) + e.amount;
    });
    return result;
}

async function getTopCategory() {
    const byCategory = await getExpensesByCategory();
    let top = null;
    let max = 0;

    Object.entries(byCategory).forEach(([category, amount]) => {
        if (amount > max) {
            max = amount;
            top = category;
        }
    });

    return top ? `${EXPENSE_CATEGORIES[top].label} — ${formatVnd(max)}` : '—';
}

async function updateBudgetUI(useCached = false) {
    const budgetRub = useCached ? (window.appData.settings?.budgetRub || 600000) : await getBudget();
    const expenses = useCached ? window.appData.expenses : await getExpenses();
    const spentVnd = expenses.reduce((sum, e) => sum + e.amount, 0);
    const spentRub = vndToRub(spentVnd);
    const remainingRub = budgetRub - spentRub;
    const percent = Math.min((spentRub / budgetRub) * 100, 100);

    // Дашборд
    const spentEl = document.getElementById('spent-amount');
    const totalEl = document.getElementById('total-budget');
    const remainingEl = document.getElementById('budget-remaining');
    const progressBar = document.getElementById('budget-progress-bar');
    const categoriesEl = document.getElementById('budget-categories');

    if (spentEl) spentEl.textContent = formatRub(spentRub);
    if (totalEl) totalEl.textContent = formatRub(budgetRub);
    if (remainingEl) {
        remainingEl.textContent = `Осталось: ${formatRub(remainingRub)}`;
        remainingEl.classList.remove('warning', 'danger');
        if (percent >= 100) remainingEl.classList.add('danger');
        else if (percent >= 75) remainingEl.classList.add('warning');
    }
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.classList.remove('warning', 'danger');
        if (percent >= 100) progressBar.classList.add('danger');
        else if (percent >= 75) progressBar.classList.add('warning');
    }

    // Категории на дашборде (в рублях)
    if (categoriesEl) {
        const byCategory = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });
        const sorted = Object.entries(byCategory)
            .map(([cat, vnd]) => [cat, vndToRub(vnd)])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length > 0) {
            categoriesEl.innerHTML = sorted.map(([cat, rub]) => `
                <div class="budget-category">
                    <span class="cat-name">${EXPENSE_CATEGORIES[cat].label}:</span>
                    <span class="cat-amount">${formatRub(rub)}</span>
                </div>
            `).join('');
        } else {
            categoriesEl.innerHTML = `<div style="color: var(--text-secondary); font-size: 13px;">Пока нет трат</div>`;
        }
    }

    // Страница трат
    const expensesTotalBudget = document.getElementById('expenses-total-budget');
    const expensesProgressBar = document.getElementById('expenses-progress-bar');
    const expensesSpent = document.getElementById('expenses-spent');
    const expensesRemaining = document.getElementById('expenses-remaining');

    if (expensesTotalBudget) expensesTotalBudget.textContent = formatRub(budgetRub);
    if (expensesSpent) expensesSpent.textContent = formatRub(spentRub);
    if (expensesRemaining) expensesRemaining.textContent = formatRub(remainingRub);
    if (expensesProgressBar) {
        expensesProgressBar.style.width = `${percent}%`;
        expensesProgressBar.classList.remove('warning', 'danger');
        if (percent >= 100) expensesProgressBar.classList.add('danger');
        else if (percent >= 75) expensesProgressBar.classList.add('warning');
    }
}

async function updateExpensesUI() {
    const expenses = window.appData.expenses;
    const list = document.getElementById('expenses-list');
    const countEl = document.getElementById('expense-count');
    const averageEl = document.getElementById('expense-average');
    const topCategoryEl = document.getElementById('top-category');
    const chart = document.getElementById('expense-categories-chart');

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (countEl) countEl.textContent = expenses.length;
    if (averageEl) {
        const avg = expenses.length > 0 ? totalSpent / expenses.length : 0;
        averageEl.textContent = formatVnd(avg);
    }
    if (topCategoryEl) {
        const byCategory = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });
        let top = null;
        let max = 0;
        Object.entries(byCategory).forEach(([category, amount]) => {
            if (amount > max) {
                max = amount;
                top = category;
            }
        });
        topCategoryEl.textContent = top ? `${EXPENSE_CATEGORIES[top].label} — ${formatVnd(max)}` : '—';
    }

    // Список трат
    if (list) {
        if (expenses.length === 0) {
            list.innerHTML = `
                <div class="empty-state-small">
                    <span class="empty-icon" style="font-size: 32px;">💸</span>
                    <p>Пока нет трат. Добавьте первую слева.</p>
                </div>
            `;
        } else {
            const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            list.innerHTML = sorted.map(e => {
                const cat = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.other;
                return `
                    <div class="expense-item">
                        <div class="expense-item-info">
                            <div class="expense-item-name">${e.name}</div>
                            <div class="expense-item-meta">${cat.label} • ${formatDateRu(e.date)}${e.notes ? ' • ' + e.notes : ''}</div>
                        </div>
                        <div class="expense-item-amount">${formatVnd(e.amount)}</div>
                        <div class="expense-item-actions">
                            <button class="btn btn-danger" onclick="deleteExpense('${e.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // График категорий
    if (chart) {
        const byCategory = await getExpensesByCategory();
        const total = await getTotalSpent();
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            chart.innerHTML = `<div class="empty-state-small"><p>Добавьте траты, чтобы увидеть распределение по категориям</p></div>`;
        } else {
            chart.innerHTML = sorted.map(([cat, amount]) => {
                const catInfo = EXPENSE_CATEGORIES[cat] || EXPENSE_CATEGORIES.other;
                const percent = total > 0 ? (amount / total) * 100 : 0;
                return `
                    <div class="expense-category-bar">
                        <div class="bar-label">${catInfo.label}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${percent}%; background: ${catInfo.color};"></div>
                            <div class="bar-value">${formatVnd(amount)} (${percent.toFixed(0)}%)</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function editBudget() {
    getBudget().then(currentBudget => {
        const newBudget = prompt('Введите общий бюджет поездки (₽):', currentBudget);

        if (newBudget !== null && newBudget !== '') {
            const amount = parseFloat(newBudget.replace(/\s/g, '').replace(/,/g, '.'));
            if (!isNaN(amount) && amount > 0) {
                setBudget(amount).then(() => {
                    updateBudgetUI();
                    updateExpensesUI();
                });
            } else {
                alert('Введите корректную сумму');
            }
        }
    });
}

function formatDateRu(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Экспорт/импорт трат
function exportExpenses() {
    getExpenses().then(expenses => {
        const dataStr = JSON.stringify(expenses, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `vietnam-expenses-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function importExpenses() {
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
                if (Array.isArray(imported)) {
                    await saveExpenses(imported);
                    updateBudgetUI();
                    updateExpensesUI();
                    alert('Траты импортированы успешно!');
                }
            } catch (error) {
                alert('Ошибка импорта: неверный формат файла');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function clearExpenses() {
    if (!confirm('Удалить ВСЕ траты? Это действие нельзя отменить.')) return;
    saveExpenses([]).then(() => {
        updateBudgetUI();
        updateExpensesUI();
    });
}
