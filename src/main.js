const { app, BrowserWindow, Menu, Tray, ipcMain, screen, dialog, globalShortcut, clipboard, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { UPDATE_CHECK_INTERVAL_MS, serializeUpdateResult } = require('./update-utils');

app.setAppUserModelId('캐릭터 Todo V2.5.13');

autoUpdater.autoDownload = false;
autoUpdater.allowDowngrade = false;
autoUpdater.verifyUpdateCodeSignature = false;

const fs = require('fs');
const path = require('path');
const googleAuth = require('./google-auth');

function getGeminiConfigPath() {
  return path.join(app.getPath('userData'), 'gemini-config.json');
}

function getGeminiApiKey() {
  try {
    const data = fs.readFileSync(getGeminiConfigPath(), 'utf8');
    return JSON.parse(data).apiKey || '';
  } catch {
    return '';
  }
}

function setGeminiApiKey(key) {
  try {
    fs.writeFileSync(getGeminiConfigPath(), JSON.stringify({ apiKey: key }), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save gemini key:', err);
    return false;
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: true }).show();
  }
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Alt+T', async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      if (mainWindow) {
        showMainWindow();
        mainWindow.webContents.send('gemini:prompt-api-key');
      } else {
        showNotification('Character Todo', 'Gemini API 키가 설정되지 않았습니다. 앱에서 설정해주세요.');
      }
      return;
    }

    const image = clipboard.readImage();
    if (image.isEmpty()) {
      showNotification('캡처 실패', '클립보드에 이미지가 없습니다.');
      return;
    }

    showNotification('분석 중...', '제미나이가 이미지를 분석하고 있습니다.');

    try {
      const base64Image = image.toPNG().toString('base64');
      const payload = {
        contents: [{
          parts: [
            { text: "이 이미지에서 '할일(제목)'과 '마감일자(선택사항, 있다면 ISO 8601 YYYY-MM-DD 형식)'를 뽑아줘. 반드시 JSON 형식으로만 응답해. 예시: {\"title\": \"보고서 작성\", \"due\": \"2024-10-25\", \"note\": \"참고사항\"}. 할일 제목만 찾을 수 있으면 due는 null로 해." },
            {
              inline_data: {
                mime_type: "image/png",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let resultText = null;

      for (const modelName of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
              resultText = data.candidates[0].content.parts[0].text;
              break;
            }
          }
        } catch (e) {
          logError(`[${modelName}] fetch error`, e);
        }
      }

      if (!resultText) {
        throw new Error('API 오류: 사용할 수 있는 Gemini 모델을 찾지 못했습니다. API 키나 네트워크를 확인하세요.');
      }

      const parsed = JSON.parse(resultText);

      if (parsed.title) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('gemini:task-captured', parsed);
          showNotification('할일 분석 완료', `'${parsed.title}' 추가 중...`);
        }
      } else {
        showNotification('분석 실패', '이미지에서 할일을 찾을 수 없습니다.');
      }
    } catch (err) {
      logError('Gemini API Error', err);
      showNotification('에러 발생', '제미나이 분석 중 에러가 발생했습니다.');
    }
  });
}

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:not-available', info);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:download-progress', {
      percent: Math.round(progressObj.percent || 0),
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
      bytesPerSecond: progressObj.bytesPerSecond || 0
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:downloaded', info);
  }
  setTimeout(() => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
    } catch {
      // ignore
    }
    autoUpdater.quitAndInstall(false, true);
    setTimeout(() => {
      app.exit(0);
    }, 500);
  }, 1500);
});

autoUpdater.on('error', (err) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:error', err?.message || String(err));
  }
});

const WINDOW_SIZE = {
  collapsed: { width: 290, height: 230 },
  expanded: { width: 410, height: 575 }
};

let mainWindow;
let tray;
let expanded = false;

function getErrorLogPath() {
  try {
    return path.join(app.getPath('userData'), 'error.log');
  } catch {
    return path.join(process.env.TEMP || process.cwd(), 'character-todo-error.log');
  }
}

function logError(message, error) {
  const detail = error?.stack || error?.message || String(error || '');

  try {
    const logFilePath = getErrorLogPath();
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(
      logFilePath,
      `[${new Date().toISOString()}] ${message}${detail ? `\n${detail}` : ''}\n`,
      'utf8'
    );
  } catch (logWriteError) {
    console.error(message, error, logWriteError);
  }
}

function requestSingleInstanceLockSafely() {
  try {
    return app.requestSingleInstanceLock();
  } catch (error) {
    logError('Failed to acquire single instance lock.', error);
    return false;
  }
}

process.on('uncaughtException', (error) => {
  logError('Uncaught main process exception.', error);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled main process rejection.', reason);
});

app.on('child-process-gone', (_event, details) => {
  if (details?.type === 'GPU') {
    logError(`GPU process exited: ${details.reason || 'unknown reason'}.`);
  }
});

const gotSingleInstanceLock = requestSingleInstanceLockSafely();

function getTodoStoragePath() {
  return path.join(app.getPath('userData'), 'todos.json');
}

async function loadTodoStorage() {
  try {
    const raw = await fs.promises.readFile(getTodoStoragePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to load todos:', error);
    return [];
  }
}

async function saveTodoStorage(_event, nextTodos) {
  if (!Array.isArray(nextTodos)) return { ok: false };

  try {
    const filePath = getTodoStoragePath();
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(nextTodos, null, 2), 'utf8');
    
    if (googleAuth.isAuthenticated()) {
      try {
        const syncedTodos = await googleAuth.syncTasks(nextTodos);
        await fs.promises.writeFile(filePath, JSON.stringify(syncedTodos, null, 2), 'utf8');
        return { ok: true, syncedTodos };
      } catch (e) {
        console.error("Auto sync failed:", e);
      }
    }
    
    return { ok: true, syncedTodos: nextTodos };
  } catch (error) {
    console.error('Failed to save todos:', error);
    return { ok: false };
  }
}

function enableAutoLaunch() {
  if (!app.isPackaged || process.platform !== 'win32') return;

  app.setLoginItemSettings({
    name: 'Character Todo',
    openAtLogin: true,
    openAsHidden: false,
    path: process.execPath,
    args: []
  });
}

function getAppIconPath() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  if (fs.existsSync(iconPath)) return iconPath;
  return path.join(__dirname, '..', 'assets', 'character-slim.png');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampBounds(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  return {
    x: clamp(bounds.x, area.x, area.x + area.width - bounds.width),
    y: clamp(bounds.y, area.y, area.y + area.height - bounds.height),
    width: bounds.width,
    height: bounds.height
  };
}

function getVisibleRect(bounds) {
  if (expanded) {
    return bounds;
  }

  return {
    x: bounds.x + WINDOW_SIZE.expanded.width - WINDOW_SIZE.collapsed.width,
    y: bounds.y + WINDOW_SIZE.expanded.height - WINDOW_SIZE.collapsed.height,
    ...WINDOW_SIZE.collapsed
  };
}

function clampWindowByVisibleRect(bounds) {
  const visible = getVisibleRect(bounds);
  const display = screen.getDisplayMatching(visible);
  const area = display.workArea;
  const clampedVisible = {
    ...visible,
    x: clamp(visible.x, area.x, area.x + area.width - visible.width),
    y: clamp(visible.y, area.y, area.y + area.height - visible.height)
  };

  if (expanded) {
    return clampedVisible;
  }

  return {
    ...bounds,
    x: clampedVisible.x - (WINDOW_SIZE.expanded.width - WINDOW_SIZE.collapsed.width),
    y: clampedVisible.y - (WINDOW_SIZE.expanded.height - WINDOW_SIZE.collapsed.height)
  };
}

function setExpandedState(nextExpanded) {
  if (!mainWindow || expanded === nextExpanded) return;
  expanded = nextExpanded;
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (mainWindow) mainWindow.hide();
}

function createTray() {
  if (tray) return;

  tray = new Tray(getAppIconPath());
  tray.setToolTip('Character Todo');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '열기',
      click: showMainWindow
    },
    {
      label: '숨기기',
      click: hideMainWindow
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => app.quit()
    }
  ]));
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

function createWindow() {
  expanded = false;
  const size = WINDOW_SIZE.expanded;
  const area = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: area.x + area.width - size.width - 18,
    y: area.y + area.height - size.height - 18,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setVisibleOnAllWorkspaces(false);

  mainWindow.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([
      {
        label: '종료',
        click: () => app.quit()
      }
    ]).popup({ window: mainWindow });
  });
  mainWindow.on('blur', () => {
    mainWindow.setAlwaysOnTop(false);
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady()
    .then(() => {
      enableAutoLaunch();
      createWindow();
      createTray();
      registerGlobalShortcuts();

      app.on('activate', () => {
        showMainWindow();
      });

      googleAuth.loadCredentials();

      function triggerAutoUpdateCheck() {
        if (app.isPackaged) {
          autoUpdater.checkForUpdates().catch((err) => {
            console.error('Auto update check failed:', err);
          });
        }
      }

      setTimeout(() => {
        triggerAutoUpdateCheck();
        setInterval(triggerAutoUpdateCheck, UPDATE_CHECK_INTERVAL_MS);
      }, 3000);
    })
    .catch((error) => {
      logError('Failed to start app.', error);
      app.quit();
    });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('widget:set-expanded', (_event, nextExpanded) => {
  setExpandedState(Boolean(nextExpanded));
});

ipcMain.handle('widget:move-by', (_event, delta) => {
  if (!mainWindow) return;

  const current = mainWindow.getBounds();
  mainWindow.setBounds(
    {
      ...current,
      x: current.x + Math.round(delta.dx),
      y: current.y + Math.round(delta.dy)
    },
    false
  );
});

ipcMain.handle('todos:load', loadTodoStorage);
ipcMain.handle('todos:save', saveTodoStorage);

ipcMain.handle('google:auth-status', () => {
  return { loggedIn: googleAuth.isAuthenticated() };
});

ipcMain.handle('google:login', async () => {
  try {
    await googleAuth.authorize(mainWindow);
    return true;
  } catch (err) {
    console.error('Google login failed:', err);
    return false;
  }
});

ipcMain.handle('google:logout', () => {
  googleAuth.logout();
  return true;
});

ipcMain.handle('google:sync', async () => {
  try {
    const currentTodos = await loadTodoStorage();
    const syncedTodos = await googleAuth.syncTasks(currentTodos);
    const filePath = getTodoStoragePath();
    await fs.promises.writeFile(filePath, JSON.stringify(syncedTodos, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Sync failed:', err);
    return false;
  }
});

ipcMain.handle('google:delete-task', async (_event, googleTaskId) => {
  if (googleTaskId) {
    await googleAuth.deleteTask(googleTaskId);
  }
});

ipcMain.handle('google:show-confirm', async (_event, message) => {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['취소', '확인'],
    defaultId: 1,
    title: '확인',
    message: message,
  });
  return result.response === 1;
});

ipcMain.handle('gemini:get-key', () => {
  return getGeminiApiKey();
});

ipcMain.handle('gemini:set-key', (_event, key) => {
  return setGeminiApiKey(key);
});

ipcMain.handle('app:open-external', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { available: false, dev: true, currentVersion: app.getVersion() };
  try {
    const result = await autoUpdater.checkForUpdates();
    return serializeUpdateResult(result, app.getVersion());
  } catch (err) {
    console.error('Check update failed:', err);
    return { error: err.message, currentVersion: app.getVersion() };
  }
});

ipcMain.handle('update:start-download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    console.error('Download update failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('update:quit-and-install', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  } catch {
    // ignore
  }
  autoUpdater.quitAndInstall(false, true);
  setTimeout(() => {
    app.exit(0);
  }, 500);
});
