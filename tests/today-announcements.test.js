const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const modulePath = join(__dirname, '..', 'src', 'today-announcements.js');

test('today announcement settings default to enabled every thirty minutes', () => {
  assert.equal(existsSync(modulePath), true);
  if (!existsSync(modulePath)) return;

  const {
    DEFAULT_ANNOUNCEMENT_INTERVAL_MINUTES,
    normalizeAnnouncementSettings
  } = require(modulePath);

  assert.equal(DEFAULT_ANNOUNCEMENT_INTERVAL_MINUTES, 30);
  assert.deepEqual(normalizeAnnouncementSettings(), { enabled: true, intervalMinutes: 30 });
  assert.deepEqual(normalizeAnnouncementSettings({ enabled: false, intervalMinutes: 30 }), {
    enabled: false,
    intervalMinutes: 30
  });
  assert.deepEqual(normalizeAnnouncementSettings({ intervalMinutes: 999 }), {
    enabled: true,
    intervalMinutes: 30
  });
});

test('today announcement messages require a task and do not repeat the previous sentence', () => {
  assert.equal(existsSync(modulePath), true);
  if (!existsSync(modulePath)) return;

  const { pickTodayAnnouncement } = require(modulePath);
  const first = pickTodayAnnouncement(10, null, () => 0);
  const next = pickTodayAnnouncement(10, first, () => 0);

  assert.match(first, /10/);
  assert.notEqual(next, first);
  assert.equal(pickTodayAnnouncement(0, null, () => 0), null);
  assert.equal(pickTodayAnnouncement(-1, null, () => 0), null);
});
