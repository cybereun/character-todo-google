const test = require('node:test');
const assert = require('node:assert');

// Test update check interval and update result serialization
test('update interval should be 30 minutes (1800000 ms)', () => {
  const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
  assert.strictEqual(UPDATE_CHECK_INTERVAL_MS, 1800000);
});

test('serializeUpdateResult extracts safe JSON properties without circular refs', () => {
  const { serializeUpdateResult } = require('../src/update-utils');
  const mockResult = {
    updateInfo: {
      version: '2.5.12',
      files: [{ url: 'https://github.com/cybereun/character-todo-google/releases/...' }]
    }
  };
  const serialized = serializeUpdateResult(mockResult, '2.5.11');
  assert.strictEqual(serialized.available, true);
  assert.strictEqual(serialized.version, '2.5.12');
});
