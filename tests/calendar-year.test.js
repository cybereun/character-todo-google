const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const renderer = readFileSync(join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = readFileSync(join(__dirname, '..', 'src', 'index.html'), 'utf8');
const styles = readFileSync(join(__dirname, '..', 'src', 'styles.css'), 'utf8');

test('calendar supports selecting a year without changing todo storage', () => {
  assert.match(html, /data-calendar-action="toggle-year-picker"/);
  assert.match(html, /class="calendar-year-picker" role="listbox"/);
  assert.match(renderer, /function renderCalendarYearPicker()/);
  assert.match(renderer, /Array\.from\(\{ length: 11 \},[\s\S]*?currentYear - 5/);
  assert.match(renderer, /calendarMonth = new Date\(year, calendarMonth\.getMonth\(\), 1\);/);
  assert.match(renderer, /data-calendar-year/);
  assert.match(renderer, /action === 'toggle-year-picker'/);
  assert.match(styles, /\.calendar-year-picker \{[\s\S]*?grid-template-columns: repeat\(3/);
  assert.match(styles, /\.calendar-year-option\.is-selected \{[\s\S]*?linear-gradient/);
});
