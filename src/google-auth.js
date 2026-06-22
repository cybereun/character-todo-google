const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { app, shell } = require('electron');
const crypto = require('crypto');

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events'
];
const TOKEN_PATH = path.join(app.getPath('userData'), 'google_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

let oauth2Client = null;
let googleTasksApi = null;
let googleCalendarApi = null;
let tasklistId = '@default';
const pendingDeletions = new Set();
const pendingDeletedDates = new Set();
let currentCodeVerifier = null;


function cleanGoogleText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll('[완료]', '[완료]')
    .replaceAll('완료', '완료')
    .trim();
}
async function loadCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('credentials.json not found!');
      return false;
    }
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const credentials = JSON.parse(content);
    const { client_secret, client_id } = credentials.installed;
    
    // 구글 정책상 PKCE를 사용하더라도 client_secret은 무조건 같이 보내야 합니다.
    oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/oauth2callback');
    googleTasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
    googleCalendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
    
    if (fs.existsSync(TOKEN_PATH)) {
      const token = fs.readFileSync(TOKEN_PATH, 'utf8');
      const tokenObj = JSON.parse(token);
      
      const hasCalendarScope = tokenObj.scope && tokenObj.scope.includes('calendar.events');
      if (!hasCalendarScope) {
        console.log('Token missing calendar scope. Forcing re-auth.');
        fs.unlinkSync(TOKEN_PATH);
      } else {
        oauth2Client.setCredentials(tokenObj);
      }
    }
    return true;
  } catch (err) {
    console.error('Error loading client secret file:', err);
    return false;
  }
}

async function getAuthUrl() {
  if (!oauth2Client) await loadCredentials();
  if (!oauth2Client) return null;
  
  currentCodeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(currentCodeVerifier).digest('base64url');
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
}

async function authorize(mainWindow) {
  const authUrl = await getAuthUrl();
  if (!authUrl) throw new Error('No auth URL generated');

  return new Promise((resolve, reject) => {
    const sockets = new Set();
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          res.setHeader('Connection', 'close');
          res.end('<h1>Authentication successful!</h1><p>You can safely close this browser window and return to Character Todo app.</p><script>window.close()</script>');
          
          server.close();
          for (const socket of sockets) {
            socket.destroy();
          }
          
          if (code) {
            const { tokens } = await oauth2Client.getToken({
              code: code,
              codeVerifier: currentCodeVerifier
            });
            currentCodeVerifier = null;
            oauth2Client.setCredentials(tokens);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('google:auth-success');
            }
            resolve(true);
          } else {
            reject(new Error('No code found'));
          }
        }
      } catch (e) {
        server.close();
        for (const socket of sockets) {
          socket.destroy();
        }
        reject(e);
      }
    });

    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });

    server.listen(3000, () => {
      shell.openExternal(authUrl);
    });
  });
}

function isAuthenticated() {
  return fs.existsSync(TOKEN_PATH);
}

function getTasksApi() {
  return googleTasksApi;
}

function getCalendarApi() {
  return googleCalendarApi;
}

function logout() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
  if (oauth2Client) {
    oauth2Client.setCredentials(null);
  }
}

async function refreshCalendarEventTitle(todo) {
  if (!todo.googleEventId || !todo.dueAt || !googleCalendarApi) return;

  const dateRange = getLocalDateRange(todo.dueAt);
  if (dateRange && pendingDeletedDates.has(dateRange.dateString)) return;

  const startDateTime = new Date(todo.dueAt);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  const cleanTitle = cleanGoogleText(todo.text).replace(/^\[완료\]\s*/, '');
  const summary = todo.status === 'completed' ? '[완료] ' + cleanTitle : cleanTitle;

  try {
    await googleCalendarApi.events.patch({
      calendarId: 'primary',
      eventId: todo.googleEventId,
      requestBody: {
        summary,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() }
      }
    });
  } catch (err) {
    console.error('Failed to refresh calendar event title:', err);
  }
}

async function syncTasks(localTodos) {
  if (!oauth2Client) await loadCredentials();
  if (!isAuthenticated()) return localTodos;
  
  const tasksApi = getTasksApi();
  if (!tasksApi) return localTodos;
  
  const tasklistId = '@default';
  
  let remoteTasks = [];
  try {
    const res = await tasksApi.tasks.list({ tasklist: tasklistId, maxResults: 100, showHidden: true });
    remoteTasks = res.data.items || [];
  } catch (err) {
    fs.appendFileSync(path.join(app.getPath('userData'), 'error.log'), `[${new Date().toISOString()}] Error fetching tasks: ${err.message}\n`);
    console.error('Error fetching google tasks:', err);
    return localTodos;
  }
  
  const remoteTaskMap = new Map(remoteTasks.map(t => [t.id, t]));
  const remoteTaskByTitle = new Map(remoteTasks.map(t => [t.title, t]));
  const allLocalIds = new Set(localTodos.map(t => t.googleTaskId).filter(Boolean));
  
  for (const todo of localTodos) {
    if (!todo.googleTaskId && remoteTaskByTitle.has(todo.text)) {
      todo.googleTaskId = remoteTaskByTitle.get(todo.text).id;
      allLocalIds.add(todo.googleTaskId);
      remoteTaskByTitle.delete(todo.text);
    }
  }

  const localTodosToKeep = [];

  for (const todo of localTodos) {
    if (todo.googleTaskId && !remoteTaskMap.has(todo.googleTaskId)) {
      continue;
    }

    localTodosToKeep.push(todo);

    let dueDateString = null;
    let dueDateKey = null;
    if (todo.dueAt) {
      const d = new Date(todo.dueAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dueDateKey = `${yyyy}-${mm}-${dd}`;
      dueDateString = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
    }

    if (dueDateKey && pendingDeletedDates.has(dueDateKey)) {
      continue;
    }

    const taskBody = {
      title: cleanGoogleText(todo.text),
      status: todo.status === 'completed' ? 'completed' : 'needsAction',
      due: dueDateString,
    };
    
      if (todo.googleTaskId && remoteTaskMap.has(todo.googleTaskId)) {
        const remote = remoteTaskMap.get(todo.googleTaskId);
        const isStatusChanged = remote.status !== taskBody.status;
        const isTitleChanged = remote.title !== taskBody.title;
        const isDueChanged = (remote.due ? remote.due : null) !== taskBody.due;
        
        if (isStatusChanged || isTitleChanged || isDueChanged) {
        const remoteUpdated = new Date(remote.updated).getTime();
        const localUpdated = todo.updatedAt || 0;
        
        if (localUpdated > remoteUpdated) {
          try {
            await tasksApi.tasks.update({
              tasklist: tasklistId,
              task: todo.googleTaskId,
              requestBody: { ...remote, ...taskBody }
            });
            // Calendar event update removed

          } catch (e) { console.error('Failed to update task:', e); }
        } else {
          todo.text = cleanGoogleText(remote.title);
          todo.status = remote.status === 'completed' ? 'completed' : 'active';
          todo.updatedAt = remoteUpdated;
          if (remote.due) {
            const remoteDateStr = remote.due.split('T')[0];
            const localDate = todo.dueAt ? new Date(todo.dueAt) : null;
            if (!localDate) {
              todo.dueAt = new Date(remote.due).getTime();
            } else {
              const yyyy = localDate.getFullYear();
              const mm = String(localDate.getMonth() + 1).padStart(2, '0');
              const dd = String(localDate.getDate()).padStart(2, '0');
              const localDateStr = `${yyyy}-${mm}-${dd}`;
              if (remoteDateStr !== localDateStr) {
                todo.dueAt = new Date(remote.due).getTime();
              }
            }
          }
          if (remote.completed) todo.completedAt = new Date(remote.completed).getTime();
        }
      }
    } else {
      if (todo.status === 'completed') {
        continue;
      }
      try {
        const res = await tasksApi.tasks.insert({
          tasklist: tasklistId,
          requestBody: taskBody
        });
        todo.googleTaskId = res.data.id;
        allLocalIds.add(res.data.id);
        
        // 캘린더 이벤트 삽입/업데이트 제거 (사용자 요청: 구글 태스크만 들어가고 일정은 들어가지 않도록)
      } catch (err) {
        console.error('Failed to insert new task:', err);
      }
    }
  }
  
  for (const remote of remoteTasks) {
    if (pendingDeletions.has(remote.id)) {
      continue;
    }
    if (!allLocalIds.has(remote.id)) {
      const newLocal = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: cleanGoogleText(remote.title),
        status: remote.status === 'completed' ? 'completed' : 'active',
        dueAt: remote.due ? new Date(remote.due).getTime() : null,
        completedAt: remote.completed ? new Date(remote.completed).getTime() : null,
        updatedAt: new Date(remote.updated).getTime(),
        subtasks: [],
        googleTaskId: remote.id,
        googleEventId: null
      };
      if (newLocal.text) {
        localTodosToKeep.unshift(newLocal);
      }
    }
  }
  
  for (const todo of localTodosToKeep) {
    await refreshCalendarEventTitle(todo);
  }

  return localTodosToKeep;
}

function getLocalDateRange(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return null;

  const date = new Date(Number(timestamp));
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');

  return {
    dateString: `${yyyy}-${mm}-${dd}`,
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
}

async function listAllGoogleTasks(tasksApi) {
  const tasks = [];
  let pageToken = null;

  do {
    const res = await tasksApi.tasks.list({
      tasklist: '@default',
      maxResults: 100,
      showCompleted: true,
      showHidden: true,
      pageToken: pageToken || undefined
    });
    tasks.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken || null;
  } while (pageToken);

  return tasks;
}

async function deleteTasksOnDate(tasksApi, dateString) {
  pendingDeletedDates.add(dateString);
  const remoteTasks = await listAllGoogleTasks(tasksApi);
  const tasksOnDate = remoteTasks.filter((task) => task.due && task.due.split('T')[0] === dateString);

  for (const task of tasksOnDate) {
    pendingDeletions.add(task.id);
    try {
      await tasksApi.tasks.delete({
        tasklist: '@default',
        task: task.id
      });
    } catch (err) {
      console.error('Error deleting google task on same date:', err);
    }
  }
}

async function deleteCalendarEventById(calendarApi, eventId) {
  if (!eventId) return;

  try {
    await calendarApi.events.delete({
      calendarId: 'primary',
      eventId
    });
  } catch (err) {
    if (![404, 410].includes(err?.code)) {
      console.error('Error deleting google calendar event by id:', err);
    }
  }
}

async function deleteCalendarEventsOnDate(calendarApi, dateRange) {
  let pageToken = null;

  do {
    const res = await calendarApi.events.list({
      calendarId: 'primary',
      timeMin: dateRange.timeMin,
      timeMax: dateRange.timeMax,
      timeZone: 'Asia/Seoul',
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken: pageToken || undefined
    });
    const events = res.data.items || [];

    for (const event of events) {
      await deleteCalendarEventById(calendarApi, event.id);
    }

    pageToken = res.data.nextPageToken || null;
  } while (pageToken);
}

async function deleteTask(data) {
  if (!isAuthenticated() || !data) return;
  if (!oauth2Client) await loadCredentials();
  
  // Backward compatibility in case a string was passed
  const googleTaskId = typeof data === 'string' ? data : data.googleTaskId;
  const googleEventId = typeof data === 'string' ? null : data.googleEventId;

  const tasksApi = getTasksApi();
  const calendarApi = getCalendarApi();

  if (googleEventId && calendarApi) {
    await deleteCalendarEventById(calendarApi, googleEventId);
  }

  if (googleTaskId && tasksApi) {
    pendingDeletions.add(googleTaskId);
    try {
      await tasksApi.tasks.delete({
        tasklist: '@default',
        task: googleTaskId
      });
    } catch (err) {
      console.error('Error deleting google task:', err);
    }
  }
}
module.exports = {
  loadCredentials,
  authorize,
  isAuthenticated,
  getTasksApi,
  logout,
  syncTasks,
  deleteTask
};


