const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const styles = readFileSync(join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const renderer = readFileSync(join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

test('robot full blink swaps the base layer instead of showing both poses', () => {
  assert.match(renderer, /widget\.dataset\.selectedCharacter\s*=\s*selected;/);
  assert.match(
    styles,
    /\.widget\[data-selected-character="robot"\]\[data-has-todos="true"\]:not\(\[data-has-overdue="true"\]\) \.character-full\s*\{[\s\S]*?animation:\s*robot-full-base-blink 5\.8s steps\(1, end\) infinite;/,
  );
  assert.match(
    styles,
    /\.widget\[data-selected-character="robot"\]\[data-has-todos="true"\]:not\(\[data-has-overdue="true"\]\) \.character-full-blink\s*\{[\s\S]*?animation:\s*robot-full-blink 5\.8s steps\(1, end\) infinite;/,
  );
  assert.match(styles, /@keyframes robot-full-base-blink[\s\S]*?91%,\s*93%\s*\{\s*opacity:\s*0;/);
  assert.match(styles, /@keyframes robot-full-blink[\s\S]*?91%,\s*93%\s*\{\s*opacity:\s*1;/);
});
