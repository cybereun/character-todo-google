const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('character and speech bubble share one drag anchor', () => {
  const html = read('src/index.html');
  const renderer = read('src/renderer.js');
  const styles = read('src/styles.css');

  assert.match(
    html,
    /<div class="character-anchor">[\s\S]*class="speech-bubble"[\s\S]*class="character-button"/
  );
  assert.match(styles, /\.character-anchor\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*10px;[\s\S]*?bottom:\s*8px;/);
  assert.match(styles, /\.character-anchor \.speech-bubble\s*\{[\s\S]*?left:\s*-112px;[\s\S]*?bottom:\s*124px;/);
  assert.match(styles, /\.widget\[data-(?:calendar|search|schedule)-mode="true"\]\s+\.character-anchor\s*\{[\s\S]*?left:\s*134px;/);
  assert.match(renderer, /dragState\.appliedX/);
  assert.match(renderer, /requestAnimationFrame\(flushDragMove\)/);
});

test('side panels use fixed positions beside the todo panel', () => {
  const styles = read('src/styles.css');

  assert.match(styles, /\.widget\[data-calendar-mode="true"\]\s+\.calendar-panel\s*\{(?=[^}]*left:\s*396px;)(?=[^}]*right:\s*auto;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-search-mode="true"\]\s+\.search-panel\s*\{(?=[^}]*left:\s*396px;)(?=[^}]*right:\s*auto;)[^}]*\}/);
  assert.match(styles, /\.widget\[data-schedule-mode="true"\]\s+\.schedule-panel\s*\{(?=[^}]*left:\s*396px;)(?=[^}]*right:\s*auto;)[^}]*\}/);
});
