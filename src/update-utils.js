const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function serializeUpdateResult(result, currentVersion) {
  if (!result || !result.updateInfo) {
    return { available: false, currentVersion };
  }
  const latestVersion = result.updateInfo.version;
  const isNewer = Boolean(latestVersion && latestVersion !== currentVersion);
  return {
    available: isNewer,
    version: latestVersion,
    currentVersion,
    files: Array.isArray(result.updateInfo.files)
      ? result.updateInfo.files.map((f) => f.url || f.name)
      : []
  };
}

module.exports = {
  UPDATE_CHECK_INTERVAL_MS,
  serializeUpdateResult
};
