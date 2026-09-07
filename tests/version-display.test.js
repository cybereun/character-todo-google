const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');

test('settings version display uses the packaged app version', () => {
  const main = read('src/main.js');
  const preload = read('src/preload.js');
  const renderer = read('src/renderer.js');
  const index = read('src/index.html');

  assert.match(main, /ipcMain\.handle\('app:get-version',\s*\(\)\s*=>\s*app\.getVersion\(\)\)/);
  assert.match(preload, /getAppVersion:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('app:get-version'\)/);
  assert.match(renderer, /getAppVersion\(\)/);
  assert.doesNotMatch(index, /id="settings-app-version">v2\.6\.17</);
});
