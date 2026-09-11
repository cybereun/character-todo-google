const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const renderer = readFileSync(join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const main = readFileSync(join(__dirname, '..', 'src', 'main.js'), 'utf8');
const preload = readFileSync(join(__dirname, '..', 'src', 'preload.js'), 'utf8');
const html = readFileSync(join(__dirname, '..', 'src', 'index.html'), 'utf8');
const styles = readFileSync(join(__dirname, '..', 'src', 'styles.css'), 'utf8');

test('todo data keeps reminder and recurrence settings', () => {
  assert.match(renderer, /notificationMinutes: normalizeNotificationMinutes\(todo\.notificationMinutes\)/);
  assert.match(renderer, /repeat: normalizeRepeat\(todo\.repeat\)/);
  assert.match(renderer, /function getNextRepeatDueAt\(dueAt, repeat\)/);
  assert.match(renderer, /todos\.unshift\(\{[\s\S]*?dueAt: nextDueAt/);
});

test('side panels preserve the base window anchor and character position', () => {
  assert.match(main, /let baseWindowPosition = null;/);
  assert.match(main, /x: anchor\.x,[\s\S]*?y: anchor\.y/);
  assert.match(main, /baseWindowPosition = \{ x: nextBounds\.x, y: nextBounds\.y \};/);
  assert.match(styles, /\.widget\[data-calendar-mode="true"\] \.character-anchor[\s\S]*?left: 134px;/);
  assert.match(styles, /\.widget\[data-search-mode="true"\] \.character-anchor[\s\S]*?left: 134px;/);
  assert.match(styles, /\.widget\[data-schedule-mode="true"\] \.character-anchor[\s\S]*?left: 134px;/);
});

test('due reminders use the native Windows notification bridge', () => {
  assert.match(renderer, /function checkDueNotifications\(\)/);
  assert.match(renderer, /window\.characterTodo\?\.showNotification/);
  assert.match(main, /ipcMain\.handle\('notifications:show'/);
  assert.match(preload, /showNotification: \(payload\) => ipcRenderer\.invoke\('notifications:show', payload\)/);
});

test('schedule ribbon is available with colorful styling', () => {
  assert.match(html, /class="ribbon-button schedule-ribbon-button"/);
  assert.match(html, /<span>알림<\/span>/);
  assert.match(html, /<h2 class="schedule-title">알림<\/h2>/);
  assert.match(html, /<span>반복<\/span>/);
  assert.doesNotMatch(html, /알림·반복/);
  assert.match(html, /class="schedule-panel"/);
  assert.match(styles, /\.schedule-panel \{[\s\S]*?overflow: hidden;/);
  assert.match(styles, /\.schedule-help \{[\s\S]*?overflow-wrap: anywhere;/);
  assert.match(styles, /\.character-anchor \.speech-bubble \{[\s\S]*?left: -112px;[\s\S]*?bottom: 124px;[\s\S]*?z-index: 12;/);
  assert.match(styles, /\.speech-text \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: anywhere;/);
  assert.match(styles, /\.todo-item:not\(\.is-done-pending\) \.done-button::before \{[\s\S]*?border: 2px solid rgba\(218, 225, 231, 0\.96\);/);
  assert.match(styles, /\.action-ribbon \.ribbon-button\.schedule-ribbon-button \{[\s\S]*?linear-gradient/);
});
