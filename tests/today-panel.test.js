const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('today ribbon opens a separate right-side today panel', () => {
  const html = read('src/index.html');
  const renderer = read('src/renderer.js');
  const main = read('src/main.js');
  const preload = read('src/preload.js');

  assert.match(html, /class="today-panel"/);
  assert.match(html, /class="today-task-list"/);
  assert.match(html, /class="today-close-button"/);
  assert.match(renderer, /let todayMode = false;/);
  assert.match(renderer, /function renderTodayPanel\(\)/);
  assert.match(renderer, /async function setTodayMode\(/);
  assert.match(renderer, /todayView\.getTodayViewTodos\(todos/);
  assert.match(renderer, /window\.characterTodo\?\.setTodayMode/);
  assert.match(main, /today: \{ width: 700, height: 575 \}/);
  assert.match(main, /ipcMain\.handle\('widget:set-today-mode'/);
  assert.match(preload, /setTodayMode: \(todayMode\) => ipcRenderer\.invoke\('widget:set-today-mode', todayMode\)/);
});

test('today mode keeps the main todo list unfiltered and uses the shared side-panel gap', () => {
  const renderer = read('src/renderer.js');
  const styles = read('src/styles.css');

  assert.match(renderer, /renderTodayPanel\(\);/);
  assert.match(styles, /\.widget\[data-today-mode="true"\] \.todo-panel\s*\{(?=[^}]*\bleft:\s*18px;)(?=[^}]*\bwidth:\s*374px;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-today-mode="true"\] \.today-panel\s*\{(?=[^}]*\bleft:\s*396px;)(?=[^}]*\bwidth:\s*286px;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-search-mode="true"\] \.search-panel\s*\{(?=[^}]*\bleft:\s*396px;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-schedule-mode="true"\] \.schedule-panel\s*\{(?=[^}]*\bleft:\s*396px;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-calendar-mode="true"\] \.calendar-panel\s*\{(?=[^}]*\bleft:\s*414px;)[^}]*\}/);
});

test('settings expose configurable today announcements', () => {
  const html = read('src/index.html');
  const renderer = read('src/renderer.js');

  assert.match(html, /id="settings-announcement-enabled"/);
  assert.match(html, /id="settings-announcement-interval"/);
  assert.match(html, /<option value="30"(?: selected)?\>30분마다<\/option>/);
  assert.match(renderer, /speech-announcement-enabled/);
  assert.match(renderer, /speech-announcement-interval-minutes/);
  assert.match(renderer, /startTodayAnnouncementTimer\(\)/);
});
