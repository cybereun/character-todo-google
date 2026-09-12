(function attachTodayAnnouncements(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.characterTodoAnnouncements = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : null, () => {
  const DEFAULT_ANNOUNCEMENT_INTERVAL_MINUTES = 30;
  const ANNOUNCEMENT_INTERVAL_OPTIONS = [10, 30, 60, 120];
  const announcementTemplates = [
    (count) => `오늘 할일이 ${count}개 있어요!!`,
    (count) => `오늘은 ${count}개의 할 일이 기다리고 있어요!`,
    (count) => `오늘 할일 ${count}개, 하나씩 힘내봐요! 🌈`,
    (count) => `오늘 해야 할 일이 ${count}개 남아 있어요 ✨`,
    (count) => `오늘도 ${count}개만 차근차근 끝내봐요! 💪`,
    (count) => `오늘 할일 ${count}개예요! 충분히 잘할 수 있어요! 🎉`
  ];

  function normalizeAnnouncementSettings(settings = {}) {
    settings = settings || {};
    const intervalMinutes = Number(settings.intervalMinutes);
    return {
      enabled: settings.enabled !== false,
      intervalMinutes: ANNOUNCEMENT_INTERVAL_OPTIONS.includes(intervalMinutes)
        ? intervalMinutes
        : DEFAULT_ANNOUNCEMENT_INTERVAL_MINUTES
    };
  }

  function pickTodayAnnouncement(count, previousMessage = null, random = Math.random) {
    const numericCount = Number(count);
    if (!Number.isFinite(numericCount) || numericCount < 1) return null;

    const displayCount = Math.floor(numericCount);
    const candidates = announcementTemplates
      .map((template) => template(displayCount))
      .filter((message) => message !== previousMessage);
    const randomValue = Number(random());
    const safeRandomValue = Number.isFinite(randomValue) ? Math.max(0, randomValue) : 0;
    const index = Math.min(candidates.length - 1, Math.floor(safeRandomValue * candidates.length));
    return candidates[index];
  }

  return {
    ANNOUNCEMENT_INTERVAL_OPTIONS,
    DEFAULT_ANNOUNCEMENT_INTERVAL_MINUTES,
    normalizeAnnouncementSettings,
    pickTodayAnnouncement
  };
}));
