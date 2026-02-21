// ============================================
// SMART HABIT TRACKER - JAVASCRIPT
// ============================================

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const LOCAL_KEY = 'smartHabits_v2';
const SORT_MODES = {
    NAME_ASC: 'name-asc',
    NAME_DESC: 'name-desc',
    RECENT: 'recent',
    PROGRESS: 'progress'
};

// ============================================
// DOM ELEMENTS
// ============================================

const habitForm = document.getElementById('habitForm');
const habitInput = document.getElementById('habitInput');
const habitsList = document.getElementById('habitsList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortBtn = document.getElementById('sortBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetBtn = document.getElementById('resetBtn');
const importFile = document.getElementById('importFile');
const inputError = document.getElementById('inputError');
const toast = document.getElementById('toast');
const totalHabitsEl = document.getElementById('totalHabits');
const completedCountEl = document.getElementById('completedCount');
const percentageTodayEl = document.getElementById('percentageToday');

// ============================================
// STATE
// ============================================

let habits = [];
let currentFilter = 'all';
let currentSort = SORT_MODES.RECENT;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
    attachEventListeners();
    render();
    updateStats();
});

// ============================================
// EVENT LISTENERS
// ============================================

function attachEventListeners() {
    // Form submission
    habitForm.addEventListener('submit', handleAddHabit);

    // Filter buttons
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            render();
        });
    });

    // Sort button
    sortBtn.addEventListener('click', handleSort);

    // Clear button
    clearBtn.addEventListener('click', handleClearCompleted);

    // Export/Import
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', handleImport);

    // Reset button
    resetBtn.addEventListener('click', handleReset);

    // Habit actions (event delegation)
    habitsList.addEventListener('click', handleHabitAction);

    // Input validation
    habitInput.addEventListener('input', () => {
        inputError.classList.remove('show');
        inputError.textContent = '';
    });
}

// ============================================
// HABIT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Handle adding a new habit
 */
function handleAddHabit(e) {
    e.preventDefault();

    const title = habitInput.value.trim();
    inputError.classList.remove('show');

    // Validation
    if (!title) {
        showError('Please enter a habit name.');
        return;
    }

    if (title.length < 2) {
        showError('Habit name must be at least 2 characters.');
        return;
    }

    if (title.length > 50) {
        showError('Habit name must be less than 50 characters.');
        return;
    }

    if (habits.some((h) => h.title.toLowerCase() === title.toLowerCase())) {
        showError('This habit already exists.');
        habitInput.value = '';
        habitInput.focus();
        return;
    }

    // Create habit object
    const habit = {
        id: Date.now(),
        title: title,
        completed: false,
        createdAt: new Date().toISOString(),
        completedDates: [],
        streak: 0
    };

    habits.push(habit);
    saveHabits();
    render();
    updateStats();

    // Reset form
    habitForm.reset();
    habitInput.focus();
    showToast(`✅ Habit "${title}" added successfully!`, 'success');
}

/**
 * Handle habit action (complete/delete)
 */
function handleHabitAction(e) {
    const habitRow = e.target.closest('.habit-row');
    if (!habitRow) return;

    const habitId = Number(habitRow.dataset.id);

    if (e.target.classList.contains('btn-complete')) {
        toggleComplete(habitId);
    } else if (e.target.classList.contains('btn-delete')) {
        deleteHabit(habitId);
    }
}

/**
 * Toggle habit completion status
 */
function toggleComplete(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const today = new Date().toDateString();

    if (!habit.completed) {
        habit.completed = true;
        if (!habit.completedDates.includes(today)) {
            habit.completedDates.push(today);
        }
        updateStreak(habit);
        showToast(`✅ Habit "${habit.title}" completed!`, 'success');
    } else {
        habit.completed = false;
        showToast(`⏳ Habit "${habit.title}" marked as pending.`, 'warning');
    }

    saveHabits();
    render();
    updateStats();
}

/**
 * Delete a habit
 */
function deleteHabit(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (confirm(`Are you sure you want to delete "${habit.title}"?`)) {
        habits = habits.filter((h) => h.id !== habitId);
        saveHabits();
        render();
        updateStats();
        showToast(`🗑️ Habit deleted.`, 'success');
    }
}

/**
 * Update habit streak
 */
function updateStreak(habit) {
    if (habit.completedDates.length === 0) {
        habit.streak = 0;
        return;
    }

    const sortedDates = habit.completedDates
        .map((d) => new Date(d).getTime())
        .sort((a, b) => b - a);

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = sortedDates[i] - sortedDates[i + 1];
        if (Math.abs(diff - oneDayMs) < 1000) {
            streak++;
        } else {
            break;
        }
    }

    habit.streak = streak;
}

// ============================================
// FILTER & SORT FUNCTIONS
// ============================================

/**
 * Get filtered habits based on current filter
 */
function getFilteredHabits() {
    const today = new Date().toDateString();

    let filtered = habits;

    if (currentFilter === 'completed') {
        filtered = habits.filter((h) => h.completed);
    } else if (currentFilter === 'pending') {
        filtered = habits.filter((h) => !h.completed);
    } else if (currentFilter === 'today') {
        filtered = habits.filter((h) => h.completedDates.includes(today));
    }

    return getSortedHabits(filtered);
}

/**
 * Get sorted habits
 */
function getSortedHabits(habitsToSort) {
    const sorted = [...habitsToSort];

    switch (currentSort) {
        case SORT_MODES.NAME_ASC:
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case SORT_MODES.NAME_DESC:
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case SORT_MODES.PROGRESS:
            sorted.sort((a, b) => b.streak - a.streak);
            break;
        case SORT_MODES.RECENT:
        default:
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return sorted;
}

/**
 * Handle sort button click
 */
function handleSort() {
    const modes = Object.values(SORT_MODES);
    const currentIndex = modes.indexOf(currentSort);
    currentSort = modes[(currentIndex + 1) % modes.length];

    const sortNames = {
        [SORT_MODES.NAME_ASC]: '📝 Name (A-Z)',
        [SORT_MODES.NAME_DESC]: '📝 Name (Z-A)',
        [SORT_MODES.RECENT]: '📅 Recent',
        [SORT_MODES.PROGRESS]: '🔥 Progress'
    };

    showToast(`🔄 Sorted by: ${sortNames[currentSort]}`, 'warning');
    render();
}

/**
 * Handle clear completed button
 */
function handleClearCompleted() {
    const completedCount = habits.filter((h) => h.completed).length;

    if (completedCount === 0) {
        showToast('No completed habits to clear.', 'warning');
        return;
    }

    if (confirm(`Clear ${completedCount} completed habit(s)?`)) {
        habits = habits.filter((h) => !h.completed);
        saveHabits();
        render();
        updateStats();
        showToast(`✨ Cleared ${completedCount} completed habit(s).`, 'success');
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Main render function
 */
function render() {
    const filtered = getFilteredHabits();

    if (filtered.length === 0) {
        habitsList.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        habitsList.innerHTML = filtered.map(createHabitRow).join('');
    }
}

/**
 * Create habit row HTML
 */
function createHabitRow(habit) {
    const progressPercentage = habit.completed ? 100 : 0;
    const progressColor = habit.completed ? 'completed' : '';

    return `
    <div class="habit-row${habit.completed ? ' completed' : ''}" data-id="${habit.id}">
      <div class="habit-content">
        <span class="habit-title">${escapeHtml(habit.title)}</span>
        <div class="habit-meta">
          <span class="progress-badge ${progressColor}">
            📊 ${progressPercentage}%
          </span>
          ${
            habit.streak > 0
              ? `<span class="streak-badge">🔥 ${habit.streak} day${habit.streak !== 1 ? 's' : ''}</span>`
              : ''
          }
        </div>
      </div>
      <div class="habit-actions">
        <button class="btn-complete${habit.completed ? ' disabled' : ''}" ${habit.completed ? 'disabled' : ''}>
          ${habit.completed ? '✓ Done' : '✔ Complete'}
        </button>
        <button class="btn-delete">🗑 Delete</button>
      </div>
    </div>
  `;
}

// ============================================
// STATS UPDATE
// ============================================

/**
 * Update header statistics
 */
function updateStats() {
  const today = new Date().toDateString();
  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const totalHabits = habits.length;
  const percentage = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  totalHabitsEl.textContent = totalHabits;
  completedCountEl.textContent = completedToday;
  percentageTodayEl.textContent = `${percentage}%`;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Save habits to localStorage
 */
function saveHabits() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits:', error);
    showToast('❌ Error saving data.', 'error');
  }
}

/**
 * Load habits from localStorage
 */
function loadHabits() {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    habits = data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading habits:', error);
    habits = [];
    showToast('❌ Error loading data.', 'error');
  }
}

/**
 * Handle export data
 */
function handleExport() {
  const dataStr = JSON.stringify(habits, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `habits-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Data exported successfully!', 'success');
}

/**
 * Handle import data
 */
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected an array.');
      }

      habits = imported;
      saveHabits();
      render();
      updateStats();
      showToast('📤 Data imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing:', error);
      showToast(`❌ Error importing: ${error.message}`, 'error');
    }
  };

  reader.readAsText(file);
  e.target.value = '';
}

/**
 * Handle reset all data
 */
function handleReset() {
  if (
    confirm(
      'Are you sure you want to delete ALL habits? This action cannot be undone.'
    )
  ) {
    habits = [];
    currentFilter = 'all';
    currentSort = SORT_MODES.RECENT;
    filterBtns.forEach((btn) => btn.classList.remove('active'));
    filterBtns[0].classList.add('active');
    saveHabits();
    render();
    updateStats();
    showToast('🔄 All data has been reset.', 'warning');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Show error message
 */
function showError(message) {
  inputError.textContent = message;
  inputError.classList.add('show');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// END OF FILE
// ============================================