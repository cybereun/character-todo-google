const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('calendar date selection fills the new todo due date and returns focus to the todo input', () => {
  const renderer = read('src/renderer.js');

  assert.match(
    renderer,
    /function applyCalendarDateToDueInput\(dateValue\)\s*\{[\s\S]*?dueInput\.value\s*=\s*`\$\{dateValue\}T[\s\S]*?`[\s\S]*?updateDueButton\(\);[\s\S]*?\}/
  );
  assert.match(
    renderer,
    /calendarSelectedDay\s*=\s*new Date\(year, month - 1, day\);[\s\S]*?applyCalendarDateToDueInput\(dateValue\);[\s\S]*?renderCalendar\(\);[\s\S]*?todoInput\.focus\(\);/
  );
});

test('calendar date selection preserves an already chosen due time', () => {
  const renderer = read('src/renderer.js');

  assert.match(
    renderer,
    /const existingTime\s*=\s*dueInput\.value\.match\(\/T\(\\d\{2\}:\\d\{2\}\)\/\)\?\.\[1\]\s*\|\|\s*'09:00'/
  );
});
