const assert = require('node:assert/strict');
const test = require('node:test');

const { getTodayViewCount, getTodayViewTodos } = require('../src/today-view');

test('today view includes active today and overdue tasks in actionable order', () => {
  const now = new Date(2026, 8, 11, 10, 0).getTime();
  const todos = [
    { id: 'tomorrow', status: 'active', dueAt: new Date(2026, 8, 12, 9, 0).getTime() },
    { id: 'today-late', status: 'active', dueAt: new Date(2026, 8, 11, 15, 0).getTime() },
    { id: 'overdue', status: 'active', dueAt: new Date(2026, 8, 10, 17, 0).getTime() },
    { id: 'today-soon', status: 'active', dueAt: new Date(2026, 8, 11, 11, 0).getTime() },
    { id: 'completed-today', status: 'completed', dueAt: new Date(2026, 8, 11, 9, 0).getTime() },
    { id: 'no-due-date', status: 'active', dueAt: null }
  ];

  const visible = getTodayViewTodos(todos, now);

  assert.deepEqual(visible.map((todo) => todo.id), ['overdue', 'today-soon', 'today-late']);
  assert.equal(getTodayViewCount(todos, now), 3);
});

test('today view treats an earlier task due today as overdue', () => {
  const now = new Date(2026, 8, 11, 10, 0).getTime();
  const todos = [
    { id: 'later-today', status: 'active', dueAt: new Date(2026, 8, 11, 12, 0).getTime() },
    { id: 'earlier-today', status: 'active', dueAt: new Date(2026, 8, 11, 9, 0).getTime() }
  ];

  assert.deepEqual(getTodayViewTodos(todos, now).map((todo) => todo.id), ['earlier-today', 'later-today']);
});
