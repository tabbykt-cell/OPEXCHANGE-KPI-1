const { useEffect, useMemo, useState } = React;

// App constants and shared helpers.
const STORAGE_KEY = "daily-todo-react-tasks";
const PRIORITY_WEIGHT = { High: 0, Medium: 1, Low: 2, None: 3 };

function readTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Could not read tasks from localStorage.", error);
    return [];
  }
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const aDue = a.dueDate || "9999-12-31";
    const bDue = b.dueDate || "9999-12-31";
    if (aDue !== bDue) {
      return aDue.localeCompare(bDue);
    }

    const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return b.createdAt - a.createdAt;
  });
}

function formatDate(dateValue) {
  if (!dateValue) return "No due date";
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createEmptyForm() {
  return { title: "", dueDate: "", priority: "Medium" };
}

// Reusable form component for both add and edit flows.
function TaskForm({ form, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <form
      className="field-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="field">
        <label htmlFor="task-title">Task title</label>
        <input
          id="task-title"
          className="text-input"
          type="text"
          placeholder="What needs to be done?"
          value={form.title}
          onChange={(event) => onChange("title", event.target.value)}
          maxLength="120"
          required
        />
      </div>

      <div className="field-grid two-up">
        <div className="field">
          <label htmlFor="task-date">Due date (optional)</label>
          <input
            id="task-date"
            className="text-input"
            type="date"
            value={form.dueDate}
            onChange={(event) => onChange("dueDate", event.target.value)}
          />
        </div>

        <div className="field">
          <label>Priority</label>
          <div className="priority-segment" role="group" aria-label="Task priority">
            {["Low", "Medium", "High"].map((priority) => (
              <button
                key={priority}
                type="button"
                className={`priority-button ${form.priority === priority ? "active" : ""}`}
                onClick={() => onChange("priority", priority)}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="action-row">
        <button className="primary-button" type="submit">
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

// Single task card used in both active and completed lists.
function TaskCard({ task, onToggle, onEdit, onDelete }) {
  return (
    <article className={`task-card ${task.completed ? "completed" : ""}`}>
      <input
        className="task-check"
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark ${task.title} as ${task.completed ? "active" : "complete"}`}
      />

      <div className="task-main">
        <h3 className="task-title">{task.title}</h3>
        <div className="task-meta">
          {task.dueDate ? <span className="meta-chip chip-date">{formatDate(task.dueDate)}</span> : null}
          {task.priority ? (
            <span className={`meta-chip priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          ) : null}
        </div>
      </div>

      <div className="task-actions">
        <button className="icon-button" type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
          ✎
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
        >
          🗑
        </button>
      </div>
    </article>
  );
}

function App() {
  const [tasks, setTasks] = useState(() => sortTasks(readTasks()));
  const [view, setView] = useState("active");
  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);

  // Persist tasks after every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const activeTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);
  const visibleTasks = view === "active" ? activeTasks : completedTasks;
  const isEditing = editingId !== null;

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function saveTask() {
    const title = form.title.trim();
    if (!title) return;

    if (editingId) {
      const nextTasks = tasks.map((task) =>
        task.id === editingId ? { ...task, title, dueDate: form.dueDate, priority: form.priority } : task
      );
      setTasks(sortTasks(nextTasks));
    } else {
      const newTask = {
        id: crypto.randomUUID(),
        title,
        dueDate: form.dueDate,
        priority: form.priority,
        completed: false,
        createdAt: Date.now(),
      };
      setTasks(sortTasks([newTask, ...tasks]));
    }

    resetForm();
  }

  function toggleTask(taskId) {
    const nextTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(sortTasks(nextTasks));
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      dueDate: task.dueDate || "",
      priority: task.priority || "Medium",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTask(taskId) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    setTasks(tasks.filter((task) => task.id !== taskId));
    if (editingId === taskId) resetForm();
  }

  // A short status line for the gradient header.
  const summaryText =
    activeTasks.length > 0
      ? `${activeTasks.length} active task${activeTasks.length === 1 ? "" : "s"} to focus on`
      : "You’re all set for now";

  return (
    <div className="app-shell">
      <main className="phone-frame">
        {/* App header styled from the supplied logo and screen mockups. */}
        <header className="hero">
          <div className="hero-top">
            <img className="hero-logo" src="Logo.png" alt="Daily To-Do logo" />
            <div>
              <h1>Daily To-Do</h1>
              <p>Plan, focus, and accomplish with a calm daily list.</p>
            </div>
          </div>
          <div className="hero-meta">
            <span className="pill pill-soft">{summaryText}</span>
            <span className="pill pill-soft">{completedTasks.length} completed</span>
          </div>
        </header>

        <section className="main-panel">
          <nav className="tabs" aria-label="Task views">
            <button
              className={`tab-button ${view === "active" ? "active" : ""}`}
              type="button"
              onClick={() => setView("active")}
            >
              Active
            </button>
            <button
              className={`tab-button ${view === "completed" ? "active" : ""}`}
              type="button"
              onClick={() => setView("completed")}
            >
              Completed
            </button>
          </nav>

          {/* The add/edit area stays at the top for quick mobile access. */}
          <section className={isEditing ? "editor" : "composer"}>
            <div className="section-title">
              <h2>{isEditing ? "Edit task" : "Add a task"}</h2>
            </div>
            <TaskForm
              form={form}
              onChange={updateForm}
              onSubmit={saveTask}
              onCancel={isEditing ? resetForm : null}
              submitLabel={isEditing ? "Save Changes" : "Save Task"}
            />
          </section>

          <div className="list-header">
            <h2>{view === "active" ? "Active tasks" : "Completed tasks"}</h2>
            <span className="list-count">{visibleTasks.length} shown</span>
          </div>

          {/* Active and completed tasks render in separate views for clarity. */}
          {visibleTasks.length > 0 ? (
            <section className="tasks">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onEdit={startEdit}
                  onDelete={deleteTask}
                />
              ))}
            </section>
          ) : (
            <section className="empty-state">
              <img src="Logo.png" alt="" aria-hidden="true" />
              <h3>{view === "active" ? "You’re all set!" : "No completed tasks yet"}</h3>
              <p>
                {view === "active"
                  ? "Add a task above to start your day with a clear next step."
                  : "Tasks you finish will show up here so you can track your progress."}
              </p>
            </section>
          )}

          <p className="footer-note">Saved automatically on this device and available offline after first load.</p>
        </section>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
