/**
 * Smart Habit Tracker - FINAL FIXED VERSION
 */

// ============================================
// STORAGE LAYER
// ============================================

class HabitStorage {
    static key = 'smart-habits-v1';

    static load() {
        try {
            if (!this.isStorageAvailable()) return [];

            const raw = localStorage.getItem(this.key);
            if (!raw) return [];

            const data = JSON.parse(raw);
            if (!Array.isArray(data)) return [];

            return data.filter(item => this.isValidHabit(item));
        } catch (error) {
            console.error('Load error:', error);
            return [];
        }
    }

    static save(habits) {
        try {
            localStorage.setItem(this.key, JSON.stringify(habits));
            return true;
        } catch (error) {
            console.error('Save error:', error);
            return false;
        }
    }

    static clear() {
        localStorage.removeItem(this.key);
    }

    static isStorageAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    static isValidHabit(item) {
        return (
            item &&
            typeof item.id === 'number' &&
            typeof item.title === 'string' &&
            typeof item.completed === 'boolean'
        );
    }
}

// ============================================
// STATE MANAGER
// ============================================

class HabitsState {
    constructor() {
        this.habits = [...HabitStorage.load()];
    }

    getAll() {
        return JSON.parse(JSON.stringify(this.habits));
    }

    add(title) {
        if (!title || !title.trim()) {
            return { success: false, error: 'Invalid title' };
        }

        const habit = {
            id: Date.now() + Math.random(),
            title: title.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.habits.push(habit);

        if (!HabitStorage.save(this.habits)) {
            this.habits.pop();
            return { success: false, error: 'Save failed' };
        }

        return { success: true, habit };
    }

    update(id, updates) {
        const index = this.habits.findIndex(h => h.id === id);
        if (index === -1) return { success: false };

        this.habits[index] = {...this.habits[index], ...updates };
        HabitStorage.save(this.habits);

        return { success: true, habit: this.habits[index] };
    }

    remove(id) {
        this.habits = this.habits.filter(h => h.id !== id);
        HabitStorage.save(this.habits);
        return { success: true };
    }

    getStats() {
        const total = this.habits.length;
        const completed = this.habits.filter(h => h.completed).length;

        return {
            total,
            completed,
            active: total - completed,
            rate: total ? Math.round((completed / total) * 100) : 0
        };
    }

    clear() {
        this.habits = [];
        HabitStorage.clear();
    }
}

// ============================================
// UI RENDERER
// ============================================

class UIRenderer {
    static createHabitElement(habit) {
        const li = document.createElement('li');
        li.className = `habit-row ${habit.completed ? 'completed' : ''}`;
        li.dataset.id = habit.id;

        li.innerHTML = `
            <span>${habit.title}</span>
            <button data-action="complete">✓</button>
            <button data-action="delete">✕</button>
        `;

        return li;
    }

    static renderHabits(habits, container) {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        habits.forEach(habit => {
            fragment.appendChild(this.createHabitElement(habit));
        });

        container.appendChild(fragment);
    }

    static updateStats(stats, elements) {
        elements.totalHabits.textContent = stats.total;
        elements.activeHabits.textContent = stats.active;
        elements.completionRate.textContent = stats.rate + '%';
    }
}

// ============================================
// HABIT MANAGER
// ============================================

class HabitManager {
    constructor(state, elements) {
        this.state = state;
        this.elements = elements;

        this.render();
        this.updateStats();
    }

    render() {
        const habits = this.state.getAll();
        UIRenderer.renderHabits(habits, this.elements.habitsList);
    }

    updateStats() {
        const stats = this.state.getStats();
        UIRenderer.updateStats(stats, this.elements);
    }

    addHabit(title) {
        const result = this.state.add(title);

        if (result.success) {
            this.render();
            this.updateStats();
        }

        return result;
    }

    deleteHabit(id) {
        this.state.remove(id);
        this.render();
        this.updateStats();
    }

    toggleHabit(id) {
        const habits = this.state.getAll();
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        this.state.update(id, { completed: !habit.completed });
        this.render();
        this.updateStats();
    }
}

// ============================================
// APP CONTROLLER
// ============================================

class AppController {
    constructor() {
        this.cacheElements();

        const state = new HabitsState();
        this.manager = new HabitManager(state, this.elements);

        this.attachEvents();
    }

    cacheElements() {
        this.elements = {
            form: document.getElementById('habitForm'),
            input: document.getElementById('habitInput'),
            habitsList: document.getElementById('habitsList'),
            totalHabits: document.getElementById('totalHabits'),
            activeHabits: document.getElementById('activeHabits'),
            completionRate: document.getElementById('completionRate')
        };
    }

    attachEvents() {
        this.elements.form.addEventListener('submit', e => {
            e.preventDefault();
            const value = this.elements.input.value;

            const result = this.manager.addHabit(value);

            if (result.success) {
                this.elements.input.value = '';
            }
        });

        this.elements.habitsList.addEventListener('click', e => {
            const button = e.target.closest('button');
            if (!button) return;

            const id = Number(button.closest('.habit-row').dataset.id);
            const action = button.dataset.action;

            if (action === 'complete') {
                this.manager.toggleHabit(id);
            } else if (action === 'delete') {
                this.manager.deleteHabit(id);
            }
        });
    }
}

// ============================================
// BOOTSTRAP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});