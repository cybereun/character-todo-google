const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('calendar mode gives the todo panel enough width for its toolbar', () => {
  const styles = read('src/styles.css');

  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.todo-panel\s*\{(?=[^}]*\bwidth:\s*392px;)[^}]*\}/
  );
  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.todo-toolbar\s*\{(?=[^}]*\bflex-wrap:\s*nowrap;)[^}]*\}/
  );
  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.view-toggle,\s*\.widget\[data-calendar-mode="true"\] \.google-sync-btn,\s*\.widget\[data-calendar-mode="true"\] \.settings-btn,\s*\.widget\[data-calendar-mode="true"\] \.bulk-delete-btn\s*\{(?=[^}]*\bflex:\s*0 0 auto;)(?=[^}]*\bwhite-space:\s*nowrap;)[^}]*\}/
  );
});

test('calendar mode keeps the widened todo panel and calendar panel in one lane', () => {
  const styles = read('src/styles.css');

  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.calendar-panel\s*\{(?=[^}]*\bleft:\s*414px;)(?=[^}]*\bwidth:\s*410px;)[^}]*\}/
  );
});

test('calendar mode keeps the quick-action ribbon inside the todo panel', () => {
  const styles = read('src/styles.css');

  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.action-ribbon\s*\{(?=[^}]*\boverflow:\s*hidden;)[^}]*\}/
  );
  assert.match(
    styles,
    /\.widget\[data-calendar-mode="true"\] \.ribbon-button\s*\{(?=[^}]*\bflex:\s*1 1 0;)(?=[^}]*\bmin-width:\s*0;)[^}]*\}/
  );
});
