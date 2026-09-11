const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const styles = readFileSync(join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const renderer = readFileSync(join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

test('character blink swaps complete layers without stacking poses', () => {
  assert.match(renderer, /widget\.dataset\.selectedCharacter\s*=\s*selected;/);
  assert.match(
    renderer,
    /widget\.classList\.add\('is-blinking'\)/,
  );
  assert.match(
    styles,
    /\.widget\.is-blinking:not\(\.is-window-changing\)\[data-has-overdue="false"\]\[data-has-todos="false"\][\s\S]*?\.character-slim\s*,[\s\S]*?opacity:\s*0;/,
  );
  assert.match(
    styles,
    /\.widget\.is-blinking:not\(\.is-window-changing\)\[data-has-overdue="false"\]\[data-has-todos="false"\] \.character-slim-blink,[\s\S]*?opacity:\s*1;/,
  );
  assert.match(
    styles,
    /\.widget\.is-blinking:not\(\.is-window-changing\)\[data-has-overdue="false"\]\[data-has-todos="true"\] \.character-full\s*\{\s*opacity:\s*0;/,
  );
  assert.match(
    styles,
    /\.character-img\s*\{[\s\S]*?transition:\s*transform 420ms cubic-bezier\(0\.2, 1\.2, 0\.2, 1\);/,
  );
  assert.doesNotMatch(styles, /\.character-img\s*\{[\s\S]*?transition:[\s\S]*?opacity\s+280ms/);
  assert.doesNotMatch(styles, /@keyframes image-blink/);
});
