(function attachTodayView(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.characterTodoToday = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : null, () => {
  function toTimestamp(value) {
    if (value instanceof Date) return value.getTime();
    return value;
  }

  function dateKey(timestamp) {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function isTodayViewTodo(todo, now = Date.now()) {
    if (!todo || todo.status === 'completed' || !Number.isFinite(todo.dueAt)) return false;

    const nowTimestamp = toTimestamp(now);
    if (!Number.isFinite(nowTimestamp)) return false;

    return todo.dueAt <= nowTimestamp || dateKey(todo.dueAt) === dateKey(nowTimestamp);
  }

  function getTodayViewTodos(todos, now = Date.now()) {
    const nowTimestamp = toTimestamp(now);
    if (!Array.isArray(todos) || !Number.isFinite(nowTimestamp)) return [];

    return todos
      .map((todo, index) => ({ todo, index }))
      .filter(({ todo }) => isTodayViewTodo(todo, nowTimestamp))
      .sort((a, b) => {
        const aOverdue = a.todo.dueAt <= nowTimestamp;
        const bOverdue = b.todo.dueAt <= nowTimestamp;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.todo.dueAt !== b.todo.dueAt) return a.todo.dueAt - b.todo.dueAt;
        return a.index - b.index;
      })
      .map(({ todo }) => todo);
  }

  function getTodayViewCount(todos, now = Date.now()) {
    return getTodayViewTodos(todos, now).length;
  }

  return {
    getTodayViewCount,
    getTodayViewTodos,
    isTodayViewTodo
  };
}));
