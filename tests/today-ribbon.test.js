const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('today ribbon exposes a count and connects to the today view', () => {
  const html = read('src/index.html');
  const renderer = read('src/renderer.js');
  const styles = read('src/styles.css');

  assert.match(html, /class="ribbon-button today-ribbon-button"/);
  assert.match(html, /class="ribbon-badge today-ribbon-count"/);
  assert.match(html, /<script src="\.\/today-view\.js"><\/script>/);
  assert.match(renderer, /function setTodayMode\(/);
  assert.match(renderer, /todayRibbonButton\?\.addEventListener\('click'/);
  assert.match(renderer, /todayView\.getTodayViewCount\(todos/);
  assert.match(styles, /\.ribbon-badge\s*\{/);
});
