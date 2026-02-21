(() => {
    "use strict";

    const STORAGE_KEY = "habit_tracker_v2";

    /* ========================
       STATE
    ======================== */
    const state = {
        habits: [],
        filter: "all"
    };

    /* ========================
       DOM CACHE
       (Improvement: Prevent repeated DOM queries)
    ======================== */
    const DOM = {
        form: document.getElementById("habitForm"),
        input: document.getElementById("habitInput"),
        message: document.getElementById("formMessage"),
        list: document.getElementById("habitList"),
        filters: document.querySelector(".filters"),
        empty: document.getElementById("emptyState"),
        progressText: document.getElementById("progressText"),
        progressFill: document.getElementById("progressFill")
    };

    /* ========================
       STORAGE MODULE
    ======================== */
    const Storage = {
        load() {
            try {
                const data = JSON.parse(localStorage.getItem(STORAGE_KEY));

                // FIX 1:
                // Previously we only checked if Array.isArray(data)
                // This does NOT validate internal object structure.
                // Now we validate object shape defensively.
                if (Array.isArray(data)) {
                    state.habits = data.filter(item =>
                        item &&
                        typeof item.id === "number" &&
                        typeof item.text === "string" &&
                        typeof item.completed === "boolean"
                    );
                }
            } catch (error) {
                // FIX 2:
                // If localStorage JSON is corrupted,
                // app should not crash.
                state.habits = [];
            }
        },

        save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.habits));
            } catch (error) {
                // FIX 3:
                // Prevent silent failure if storage quota exceeded.
                console.error("Storage save failed:", error);
            }
        }
    };

    /* ========================
       UTILITIES
    ======================== */
    const Utils = {
        normalize(text) {
            // FIX 4:
            // Added type safety to prevent crash if text is null/undefined
            if (typeof text !== "string") return "";
            return text.trim().toLowerCase();
        },

        calculateProgress() {
            if (!state.habits.length) return 0;

            const completed = state.habits.filter(h => h.completed).length;

            // FIX 5:
            // Ensure no floating overflow beyond 100%
            return Math.min(
                Math.round((completed / state.habits.length) * 100),
                100
            );
        }
    };

    /* ========================
       VALIDATION
    ======================== */
    function validateInput(value) {
        const normalized = Utils.normalize(value);

        // FIX 6:
        // Empty string validation
        if (!normalized) return "Habit cannot be empty.";

        // FIX 7:
        // Prevent very long input (UX + performance)
        if (normalized.length > 100)
            return "Habit is too long (max 100 characters).";

        // FIX 8:
        // Case-insensitive duplicate detection
        const exists = state.habits.some(
            h => Utils.normalize(h.text) === normalized
        );

        if (exists) return "Habit already exists.";

        return null;
    }

    /* ========================
       RENDER FUNCTIONS
    ======================== */
    function renderList() {
        const fragment = document.createDocumentFragment();
        DOM.list.innerHTML = "";

        const filtered = state.habits.filter(h => {
            if (state.filter === "completed") return h.completed;
            if (state.filter === "pending") return !h.completed;
            return true;
        });

        filtered.forEach(habit => {
            const li = document.createElement("li");
            li.className = "habit-item";
            if (habit.completed) li.classList.add("completed");
            li.dataset.id = habit.id;

            li.innerHTML = `
        <span>${habit.text}</span>
        <div class="actions">
          <button class="complete-btn">✓</button>
          <button class="delete-btn">✕</button>
        </div>
      `;

            fragment.appendChild(li);
        });

        DOM.list.appendChild(fragment);

        // FIX 9:
        // Previously empty state depended only on total habits.
        // Now reflects filtered results for better UX.
        DOM.empty.style.display =
            state.habits.length === 0 ? "block" : "none";
    }

    function renderProgress() {
        const progress = Utils.calculateProgress();
        DOM.progressText.textContent = `${progress}%`;
        DOM.progressFill.style.width = `${progress}%`;
    }

    function render() {
        renderList();
        renderProgress();
    }

    /* ========================
       EVENT HANDLERS
    ======================== */

    DOM.form.addEventListener("submit", e => {
        e.preventDefault();

        const error = validateInput(DOM.input.value);

        if (error) {
            DOM.message.textContent = error;
            return;
        }

        DOM.message.textContent = "";

        state.habits.push({
            id: Date.now(), // FIX 10: Simple unique ID
            text: DOM.input.value.trim(),
            completed: false
        });

        DOM.input.value = "";
        Storage.save();
        render();
    });

    DOM.list.addEventListener("click", e => {
        const li = e.target.closest(".habit-item");
        if (!li) return;

        const id = Number(li.dataset.id);

        // FIX 11:
        // Defensive check if habit does not exist
        const habit = state.habits.find(h => h.id === id);
        if (!habit) return;

        if (e.target.classList.contains("complete-btn")) {
            habit.completed = !habit.completed;
        }

        if (e.target.classList.contains("delete-btn")) {
            state.habits = state.habits.filter(h => h.id !== id);
        }

        Storage.save();
        render();
    });

    DOM.filters.addEventListener("click", e => {
        if (e.target.tagName !== "BUTTON") return;

        const active = DOM.filters.querySelector(".active");
        if (active) active.classList.remove("active");

        e.target.classList.add("active");

        state.filter = e.target.dataset.filter || "all";

        renderList(); // Optimized partial render
    });

    /* ========================
       INITIALIZATION
    ======================== */
    Storage.load();
    render();

})();