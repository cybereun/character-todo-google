const widget = document.querySelector('.widget');
const characterButton = document.querySelector('.character-button');
const todoForm = document.querySelector('.todo-form');
const todoInput = document.querySelector('.todo-input');
const dueInput = document.querySelector('.due-input');
const dueButton = document.querySelector('.due-button');
const todoList = document.querySelector('.todo-list');
const viewToggle = document.querySelector('.view-toggle');
const todoCount = document.querySelector('.todo-count');
const undoToast = document.querySelector('.undo-toast');
const undoMessage = document.querySelector('.undo-message');
const undoButton = document.querySelector('.undo-button');
const burstLayer = document.querySelector('.burst-layer');
const googleSyncBtn = document.querySelector('.google-sync-btn');
const bulkDeleteBtn = document.querySelector('.bulk-delete-btn');
const settingsBtn = document.querySelector('.settings-btn');

let isGoogleLoggedIn = false;

const storageKey = 'character-todo-items';
const particleColors = ['#ff7f9c', '#ffd76b', '#5bbf8d', '#63a7d6', '#b28cff'];
const panelAnimationMs = 420;
const doneHoldMs = 500;
const removeAnimationMs = 620;
const undoWindowMs = 4500;
const localStorageMigrationKey = `${storageKey}:migrated-to-file`;
const minimumValidDueAt = new Date('2020-01-01T00:00:00').getTime();

let todos = [];
let expanded = false;
let showingCompleted = false;
let editingId = null;
let subtaskEntryTodoId = null;
let dragState = null;
let audioContext = null;
let undoTodoId = null;
let undoToastTimer = null;

const pendingCompletions = new Map();


function cleanDisplayText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll('[?꾨즺]', '[완료]')
    .replaceAll('[?꽂짓]', '[완료]')
    .replaceAll('?꾨즺', '완료')
    .replaceAll('?꽂짓', '완료')
    .trim();
}
function normalizeDueAt(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number' || /^[0-9]+$/.test(String(value))) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp >= minimumValidDueAt ? timestamp : null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= minimumValidDueAt ? timestamp : null;
}

function normalizeSubtask(subtask) {
  return {
    id: subtask.id || createId(),
    text: cleanDisplayText(subtask.text),
    status: subtask.status === 'completed' ? 'completed' : 'active',
    completedAt: subtask.completedAt || null
  };
}

function normalizeTodo(todo) {
  return {
    id: todo.id || createId(),
    text: cleanDisplayText(todo.text),
    status: todo.status === 'completed' ? 'completed' : 'active',
    dueAt: normalizeDueAt(todo.dueAt),
    completedAt: todo.completedAt || null,
    updatedAt: todo.updatedAt || Date.now(),
    googleTaskId: todo.googleTaskId || null,
    googleEventId: todo.googleEventId || null,
    subtasks: Array.isArray(todo.subtasks)
      ? todo.subtasks.map(normalizeSubtask).filter((subtask) => subtask.text)
      : []
  };
}

function loadLocalStorageTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeTodo).filter((todo) => todo.text) : [];
  } catch {
    return [];
  }
}

async function loadTodos() {
  const localTodos = loadLocalStorageTodos();

  if (!window.characterTodo?.loadTodos) return localTodos;

  try {
    const fileTodos = await window.characterTodo.loadTodos();
    const normalizedFileTodos = Array.isArray(fileTodos)
      ? fileTodos.map(normalizeTodo).filter((todo) => todo.text)
      : [];

    if (normalizedFileTodos.length > 0) return normalizedFileTodos;

    const alreadyMigrated = localStorage.getItem(localStorageMigrationKey) === 'true';
    if (localTodos.length > 0 && !alreadyMigrated) {
      await window.characterTodo.saveTodos(localTodos);
      localStorage.setItem(localStorageMigrationKey, 'true');
      return localTodos;
    }

    return normalizedFileTodos;
  } catch {
    return localTodos;
  }
}

async function saveTodos() {
  const normalizedTodos = todos.map(normalizeTodo).filter((todo) => todo.text);
  todos = normalizedTodos;
  localStorage.setItem(storageKey, JSON.stringify(todos));
  localStorage.setItem(localStorageMigrationKey, 'true');
  if (window.characterTodo?.saveTodos) {
    const result = await window.characterTodo.saveTodos(todos);
    if (result && result.syncedTodos) {
      todos.forEach((t) => {
        const synced = result.syncedTodos.find((st) => st.id === t.id);
        if (synced && synced.googleTaskId) {
          t.googleTaskId = synced.googleTaskId;
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(todos));
    }
  }
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function initTodos() {
  todos = await loadTodos();
  renderTodos();
  updateDueButton();
  if (window.characterTodo?.googleAuthStatus) {
    const status = await window.characterTodo.googleAuthStatus();
    isGoogleLoggedIn = status.loggedIn;
    updateGoogleSyncBtn();
  }
}

function updateGoogleSyncBtn() {
  if (!googleSyncBtn) return;
  if (isGoogleLoggedIn) {
    googleSyncBtn.textContent = 'Google Sync';
    googleSyncBtn.style.color = '#4285F4';
  } else {
    googleSyncBtn.textContent = 'Google Login';
    googleSyncBtn.style.color = 'var(--muted)';
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function setExpanded(nextExpanded) {
  if (expanded === nextExpanded) return;

  expanded = nextExpanded;
  characterButton.setAttribute('aria-label', expanded ? '할일창 닫기' : '할일창 열기');
  widget.classList.add('is-window-changing');

  if (expanded) {
    await window.characterTodo.setExpanded(true);
    requestAnimationFrame(() => {
      widget.dataset.expanded = 'true';
      window.setTimeout(() => {
        widget.classList.remove('is-window-changing');
        todoInput.focus();
      }, panelAnimationMs);
    });
    return;
  }

  widget.dataset.expanded = 'false';
  window.setTimeout(async () => {
    await window.characterTodo.setExpanded(false);
    window.setTimeout(() => {
      widget.classList.remove('is-window-changing');
    }, 120);
  }, 280);
}

function getActiveTodos() {
  return todos.filter((todo) => todo.status !== 'completed');
}

function getCompletedTodos() {
  return todos.filter((todo) => todo.status === 'completed');
}

function isOverdue(todo) {
  return todo.status !== 'completed' && Number.isFinite(todo.dueAt) && todo.dueAt <= Date.now();
}

function getVisibleTodos() {
  if (showingCompleted) {
    return getCompletedTodos().filter((todo) => !pendingCompletions.has(todo.id));
  }

  return todos.filter((todo) => todo.status !== 'completed' || pendingCompletions.has(todo.id));
}

function renderTodos() {
  const activeCount = getActiveTodos().length;
  const completedCount = getCompletedTodos().length;
  const overdueCount = getActiveTodos().filter(isOverdue).length;
  widget.dataset.hasTodos = String(activeCount > 0);
  widget.dataset.hasOverdue = String(overdueCount > 0);
  if (showingCompleted) subtaskEntryTodoId = null;
  viewToggle.textContent = showingCompleted ? '할일 목록 보기' : '완료 목록 보기';
  viewToggle.setAttribute('aria-pressed', String(showingCompleted));
  todoCount.textContent = showingCompleted
    ? `완료 ${completedCount}개`
    : overdueCount > 0
      ? `할일 ${activeCount}개 · 지남 ${overdueCount}개`
      : `할일 ${activeCount}개`;
  if (googleSyncBtn) googleSyncBtn.style.display = showingCompleted ? 'none' : 'block';
  if (bulkDeleteBtn) bulkDeleteBtn.style.display = showingCompleted ? 'block' : 'none';

  todoList.innerHTML = getVisibleTodos()
    .map((todo) => {
      const text = escapeHtml(todo.text);
      const pending = pendingCompletions.has(todo.id);
      const overdue = isOverdue(todo);
      const dueLabel = formatDueLabel(todo);
      const subtaskList = renderSubtasks(todo);

      if (!showingCompleted && todo.id === editingId) {
        return `
          <li class="todo-item is-editing" data-id="${todo.id}">
            <span class="edit-fields">
              <input class="edit-input" value="${text}" maxlength="80" aria-label="할일 수정" />
              <input class="edit-due-input" type="datetime-local" value="${formatDateTimeLocal(todo.dueAt)}" aria-label="마감 날짜와 시간 수정" />
            </span>
            <button class="icon-button save-button" type="button" data-action="save" title="저장" aria-label="저장">✓</button>
            <button class="icon-button" type="button" data-action="cancel" title="취소" aria-label="취소">×</button>
          </li>
        `;
      }

      if (showingCompleted) {
        return `
          <li class="todo-item is-completed" data-id="${todo.id}">
            <span class="todo-text" title="${text}">${text}</span>
            <span class="completed-time">${formatCompletedTime(todo.completedAt)}</span>
            <button class="icon-button restore-button" type="button" data-action="restore" title="되돌리기" aria-label="되돌리기">↩</button>
            <button class="icon-button delete-button" type="button" data-action="delete" title="삭제" aria-label="삭제">×</button>
          </li>
        `;
      }

      return `
        <li class="todo-item${pending ? ' is-done-pending' : ''}${overdue ? ' is-overdue' : ''}" data-id="${todo.id}">
          <button class="icon-button done-button" type="button" data-action="complete" title="완료" aria-label="완료">${pending ? '✓' : ''}</button>
          <span class="todo-main">
            <span class="todo-text" title="${text}">${text}</span>
            ${dueLabel ? `<span class="due-label">${dueLabel}</span>` : ''}
            ${subtaskList}
          </span>
          <button class="icon-button subtask-button" type="button" data-action="add-subtask" title="서브할일 추가" aria-label="서브할일 추가">+</button>
          <button class="icon-button" type="button" data-action="edit" title="수정" aria-label="수정">✎</button>
          <button class="icon-button delete-button" type="button" data-action="delete" title="삭제" aria-label="삭제">×</button>
        </li>
      `;
    })
    .join('');

  const editInput = todoList.querySelector('.edit-input');
  if (editInput) {
    editInput.focus();
    editInput.select();
  }

  const subtaskInput = todoList.querySelector('.subtask-input');
  if (subtaskInput) {
    subtaskInput.focus();
  }
}

function renderSubtasks(todo) {
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
  const rows = subtasks
    .map((subtask) => {
      const text = escapeHtml(subtask.text);
      const completed = subtask.status === 'completed';

      return `
        <li class="subtask-row${completed ? ' is-completed' : ''}" data-subtask-id="${subtask.id}">
          <button class="subtask-check" type="button" data-action="toggle-subtask" title="서브할일 완료" aria-label="서브할일 완료">${completed ? '✓' : ''}</button>
          <span class="subtask-text" title="${text}">${text}</span>
          <button class="subtask-delete" type="button" data-action="delete-subtask" title="서브할일 삭제" aria-label="서브할일 삭제">×</button>
        </li>
      `;
    })
    .join('');

  const entry = subtaskEntryTodoId === todo.id
    ? `
      <li class="subtask-entry-row">
        <input class="subtask-input" type="text" maxlength="80" placeholder="서브할일 입력" aria-label="서브할일 입력" />
        <button class="subtask-cancel" type="button" data-action="cancel-subtask-entry" title="취소" aria-label="취소">취소</button>
      </li>
    `
    : '';

  if (!rows && !entry) return '';
  return `<ul class="subtask-list">${rows}${entry}</ul>`;
}

function formatDueLabel(todo) {
  if (!Number.isFinite(todo.dueAt)) return '';

  const label = new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(todo.dueAt));

  return isOverdue(todo) ? `마감 지남 · ${label}` : `마감 ${label}`;
}

function formatCompletedTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const dueAt = parseDueInput(dueInput.value);

  todos.unshift({
    id: createId(),
    text: trimmed,
    status: 'active',
    dueAt,
    completedAt: null,
    updatedAt: Date.now(),
    subtasks: []
  });
  saveTodos();
  renderTodos();
  todoInput.value = '';
  dueInput.value = '';
  updateDueButton();
}

function parseDueInput(value) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  const timestamp = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5])
      ).getTime()
    : new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function updateTodo(id, text, dueValue) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const dueAt = parseDueInput(dueValue);

  todos = todos.map((todo) => (todo.id === id ? { ...todo, text: trimmed, dueAt, updatedAt: Date.now() } : todo));
  editingId = null;
  saveTodos();
  renderTodos();
}

function addSubtask(todoId, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos = todos.map((todo) =>
    todo.id === todoId
      ? {
          ...todo,
          subtasks: [
            ...(Array.isArray(todo.subtasks) ? todo.subtasks : []),
            {
              id: createId(),
              text: trimmed,
              status: 'active',
              completedAt: null
            }
          ]
        }
      : todo
  );
  saveTodos();
  renderTodos();
}

function toggleSubtask(todoId, subtaskId) {
  todos = todos.map((todo) => {
    if (todo.id !== todoId) return todo;

    return {
      ...todo,
      subtasks: todo.subtasks.map((subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              status: subtask.status === 'completed' ? 'active' : 'completed',
              completedAt: subtask.status === 'completed' ? null : Date.now()
            }
          : subtask
      )
    };
  });
  saveTodos();
  renderTodos();
}

function deleteSubtask(todoId, subtaskId) {
  todos = todos.map((todo) =>
    todo.id === todoId
      ? {
          ...todo,
          subtasks: todo.subtasks.filter((subtask) => subtask.id !== subtaskId)
        }
      : todo
  );
  saveTodos();
  renderTodos();
}

function startSubtaskEntry(id) {
  editingId = null;
  subtaskEntryTodoId = id;
  renderTodos();
}

function stopSubtaskEntry() {
  subtaskEntryTodoId = null;
  renderTodos();
}

async function deleteTodo(id) {
  clearPendingCompletion(id);
  const todoToDelete = todos.find(t => t.id === id);
  todos = todos.filter((todo) => todo.id !== id);
  if (subtaskEntryTodoId === id) subtaskEntryTodoId = null;
  if (undoTodoId === id) hideUndoToast();
  renderTodos();

  if (todoToDelete && (todoToDelete.googleTaskId || todoToDelete.googleEventId || todoToDelete.dueAt) && window.characterTodo?.deleteGoogleTask) {
    await window.characterTodo.deleteGoogleTask({
      googleTaskId: todoToDelete.googleTaskId,
      googleEventId: todoToDelete.googleEventId,
      dueAt: todoToDelete.dueAt,
      title: todoToDelete.text,
      status: todoToDelete.status,
      permanentDelete: showingCompleted || todoToDelete.status === 'completed'
    });
  }

  await saveTodos();
  renderTodos();
}

function completeTodo(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo || todo.status === 'completed' || pendingCompletions.has(id)) return;
  if (subtaskEntryTodoId === id) subtaskEntryTodoId = null;

  todos = todos.map((item) =>
    item.id === id
      ? { ...item, status: 'completed', completedAt: Date.now(), updatedAt: Date.now() }
      : item
  );

  const completion = {
    effectTimer: null,
    removeTimer: null
  };
  pendingCompletions.set(id, completion);
  saveTodos();
  renderTodos();
  showUndoToast(id, todo.text);

  completion.effectTimer = window.setTimeout(() => {
    const item = todoList.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!item) {
      pendingCompletions.delete(id);
      renderTodos();
      return;
    }

    playDoneSound();
    makeBurst();
    widget.classList.add('is-celebrating');
    item.classList.add('is-completing');

    completion.removeTimer = window.setTimeout(() => {
      pendingCompletions.delete(id);
      widget.classList.remove('is-celebrating');
      renderTodos();
    }, removeAnimationMs);
  }, doneHoldMs);
}

function clearPendingCompletion(id) {
  const completion = pendingCompletions.get(id);
  if (!completion) return;

  window.clearTimeout(completion.effectTimer);
  window.clearTimeout(completion.removeTimer);
  pendingCompletions.delete(id);
  widget.classList.remove('is-celebrating');
}

function undoCompletion(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo || todo.status !== 'completed') return;

  clearPendingCompletion(id);
  restoreTodo(id);
  hideUndoToast();
}

function restoreTodo(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo || todo.status !== 'completed') return;

  todos = todos.map((item) =>
    item.id === id
      ? { ...item, status: 'active', completedAt: null, updatedAt: Date.now() }
      : item
  );
  saveTodos();
  renderTodos();
}

function showUndoToast(id, text) {
  undoTodoId = id;
  undoMessage.textContent = `"${text}" 완료됨`;
  undoToast.classList.add('is-visible');
  window.clearTimeout(undoToastTimer);
  undoToastTimer = window.setTimeout(() => {
    if (undoTodoId === id) hideUndoToast();
  }, undoWindowMs);
}

function hideUndoToast() {
  undoTodoId = null;
  window.clearTimeout(undoToastTimer);
  undoToastTimer = null;
  undoToast.classList.remove('is-visible');
}

function playDoneSound() {
  audioContext = audioContext || new AudioContext();
  const now = audioContext.currentTime;
  const notes = [523.25, 659.25, 783.99];

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
    gain.gain.setValueAtTime(0.0001, now + index * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + index * 0.07);
    oscillator.stop(now + index * 0.07 + 0.2);
  });
}

function makeBurst() {
  burstLayer.replaceChildren();

  for (let i = 0; i < 18; i += 1) {
    const particle = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 18;
    const distance = 54 + Math.random() * 54;
    particle.className = 'particle';
    particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--particle-color', particleColors[i % particleColors.length]);
    particle.style.animationDelay = `${Math.random() * 70}ms`;
    burstLayer.append(particle);
  }

  window.setTimeout(() => burstLayer.replaceChildren(), 900);
}

function getTodoIdFromEvent(event) {
  return event.target.closest('.todo-item')?.dataset.id;
}

todoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addTodo(todoInput.value);
});

dueButton.addEventListener('click', () => {
  if (typeof dueInput.showPicker === 'function') {
    dueInput.showPicker();
    return;
  }

  dueInput.focus();
  dueInput.click();
});

dueInput.addEventListener('change', updateDueButton);

function updateDueButton() {
  dueButton.classList.toggle('is-set', Boolean(dueInput.value));
  dueButton.title = dueInput.value ? 마감  : '마감 날짜와 시간';
}

function formatInputDue(value) {
  const timestamp = parseDueInput(value);
  if (!Number.isFinite(timestamp)) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatDateTimeLocal(timestamp) {
  if (!Number.isFinite(timestamp)) return '';

  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

viewToggle.addEventListener('click', () => {
  showingCompleted = !showingCompleted;
  editingId = null;
  subtaskEntryTodoId = null;
  renderTodos();
});

undoButton.addEventListener('click', () => {
  if (undoTodoId) undoCompletion(undoTodoId);
});

todoList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = getTodoIdFromEvent(event);
  const action = button.dataset.action;
  const item = button.closest('.todo-item');

  if (action === 'complete') completeTodo(id);
  if (action === 'delete') void deleteTodo(id);
  if (action === 'restore') restoreTodo(id);
  if (action === 'edit') {
    subtaskEntryTodoId = null;
    editingId = id;
    renderTodos();
  }
  if (action === 'add-subtask') startSubtaskEntry(id);
  if (action === 'cancel-subtask-entry') stopSubtaskEntry();
  if (action === 'toggle-subtask') {
    const subtaskId = button.closest('[data-subtask-id]')?.dataset.subtaskId;
    if (subtaskId) toggleSubtask(id, subtaskId);
  }
  if (action === 'delete-subtask') {
    const subtaskId = button.closest('[data-subtask-id]')?.dataset.subtaskId;
    if (subtaskId) deleteSubtask(id, subtaskId);
  }
  if (action === 'save') {
    updateTodo(
      id,
      item.querySelector('.edit-input').value,
      item.querySelector('.edit-due-input').value
    );
  }
  if (action === 'cancel') {
    editingId = null;
    renderTodos();
  }
});

todoList.addEventListener('keydown', (event) => {
  if (event.target.matches('.subtask-input')) {
    const id = getTodoIdFromEvent(event);

    if (event.key === 'Enter') {
      event.preventDefault();
      addSubtask(id, event.target.value);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      stopSubtaskEntry();
    }
    return;
  }

  if (!event.target.matches('.edit-input, .edit-due-input')) return;

  const id = getTodoIdFromEvent(event);
  const item = event.target.closest('.todo-item');
  if (event.key === 'Enter') {
    updateTodo(
      id,
      item.querySelector('.edit-input').value,
      item.querySelector('.edit-due-input').value
    );
  }
  if (event.key === 'Escape') {
    editingId = null;
    renderTodos();
  }
});

characterButton.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;

  characterButton.setPointerCapture(event.pointerId);
  dragState = {
    pointerId: event.pointerId,
    lastX: event.screenX,
    lastY: event.screenY,
    total: 0
  };
  event.preventDefault();
});

characterButton.addEventListener('pointermove', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  const dx = event.screenX - dragState.lastX;
  const dy = event.screenY - dragState.lastY;
  if (dx === 0 && dy === 0) return;

  dragState.lastX = event.screenX;
  dragState.lastY = event.screenY;
  dragState.total += Math.abs(dx) + Math.abs(dy);
  window.characterTodo.moveBy(dx, dy);
});

characterButton.addEventListener('pointerup', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  const wasDrag = dragState.total > 6;
  dragState = null;
  characterButton.releasePointerCapture(event.pointerId);

  if (!wasDrag) setExpanded(!expanded);
});

characterButton.addEventListener('pointercancel', () => {
  dragState = null;
});

let isSyncing = false;

async function performBackgroundSync() {
  if (!isGoogleLoggedIn || isSyncing || !window.characterTodo?.syncGoogleTasks) return;
  
  try {
    isSyncing = true;
    const oldTodosStr = JSON.stringify(todos);
    
    await window.characterTodo.syncGoogleTasks();
    const newTodos = await loadTodos();
    const newTodosStr = JSON.stringify(newTodos);
    
    if (oldTodosStr !== newTodosStr) {
      todos = newTodos;
      if (!editingId && !subtaskEntryTodoId) {
        renderTodos();
      }
    }
  } catch (err) {
    console.error('Background sync failed:', err);
  } finally {
    isSyncing = false;
  }
}

googleSyncBtn?.addEventListener('click', async () => {
  if (isGoogleLoggedIn) {
    if (isSyncing) return;
    isSyncing = true;
    googleSyncBtn.textContent = 'Syncing...';
    if (window.characterTodo?.syncGoogleTasks) {
      await window.characterTodo.syncGoogleTasks();
    }
    todos = await loadTodos();
    renderTodos();
    updateGoogleSyncBtn();
    isSyncing = false;
  } else {
    if (window.characterTodo?.googleLogin) {
      await window.characterTodo.googleLogin();
    }
  }
});

if (window.characterTodo?.onGoogleAuthSuccess) {
  window.characterTodo.onGoogleAuthSuccess(async () => {
    isGoogleLoggedIn = true;
    updateGoogleSyncBtn();
    if (window.characterTodo?.syncGoogleTasks) {
      googleSyncBtn.textContent = 'Syncing...';
      await window.characterTodo.syncGoogleTasks();
    }
    todos = await loadTodos();
    renderTodos();
    updateGoogleSyncBtn();
  });
}

bulkDeleteBtn?.addEventListener('click', async () => {
  if (isSyncing) return;
  
  let confirmed = false;
  if (window.characterTodo?.showConfirm) {
    confirmed = await window.characterTodo.showConfirm('모든 완료된 일정을 삭제하시겠습니까? Google 할일과 캘린더에서도 삭제됩니다.');
  } else {
    confirmed = confirm('모든 완료된 일정을 삭제하시겠습니까? Google 할일과 캘린더에서도 삭제됩니다.');
  }
  if (!confirmed) return;

  isSyncing = true; // Prevent background sync from interfering during bulk delete
  try {
    const completedTodos = getCompletedTodos();
    for (const todo of completedTodos) {
      if ((todo.googleTaskId || todo.googleEventId || todo.dueAt) && window.characterTodo?.deleteGoogleTask) {
        await window.characterTodo.deleteGoogleTask({
          googleTaskId: todo.googleTaskId,
          googleEventId: todo.googleEventId,
          dueAt: todo.dueAt,
          title: todo.text
        });
      }
    }

    todos = todos.filter(todo => todo.status !== 'completed');
    await saveTodos();
    renderTodos();
  } finally {
    isSyncing = false;
  }
});

void initTodos();
window.setInterval(() => {
  if (!editingId && !subtaskEntryTodoId) renderTodos();
}, 15000);

// Background auto sync every 5 minutes
window.setInterval(performBackgroundSync, 5 * 60 * 1000);

// Auto sync on window focus
window.addEventListener('focus', () => {
  performBackgroundSync();
});

if (window.characterTodo?.onGeminiPromptApiKey) {
  window.characterTodo.onGeminiPromptApiKey(async () => {
    await loadGeminiKeyIntoSettings();
    if (settingsModal) settingsModal.style.display = 'flex';
  });
}

if (window.characterTodo?.onGeminiTaskCaptured) {
  window.characterTodo.onGeminiTaskCaptured((data) => {
    if (!data || !data.title) return;
    
    let dueAt = null;
    if (data.due) {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(data.due);
      if (match) {
        dueAt = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          23, 59
        ).getTime();
      }
    }
    
    todos.unshift({
      id: createId(),
      text: data.title,
      status: 'active',
      dueAt,
      completedAt: null,
      updatedAt: Date.now(),
      subtasks: []
    });
    
    saveTodos();
    if (!editingId && !subtaskEntryTodoId) {
      renderTodos();
    }
  });
}

// Auto Update Renderer Logic
function initAutoUpdateUI() {
  if (!window.characterTodo) return;

  const updateModal = document.getElementById('update-modal');
  const updateVersionTag = document.getElementById('update-version-tag');
  const updateCancelBtn = document.getElementById('update-cancel-btn');
  const updateStartBtn = document.getElementById('update-start-btn');
  const updateInfoView = document.getElementById('update-info-view');
  const updateProgressView = document.getElementById('update-progress-view');
  const updateStatusText = document.getElementById('update-status-text');
  const updateProgressFill = document.getElementById('update-progress-fill');
  const updateProgressSize = document.getElementById('update-progress-size');
  const updateProgressSpeed = document.getElementById('update-progress-speed');

  if (!updateModal) return;

  updateCancelBtn.addEventListener('click', () => {
    updateModal.style.display = 'none';
  });

  updateStartBtn.addEventListener('click', async () => {
    updateInfoView.style.display = 'none';
    updateProgressView.style.display = 'block';
    updateStatusText.textContent = '다운로드 준비 중...';
    try {
      const res = await window.characterTodo.startUpdateDownload();
      if (!res?.ok) {
        updateStatusText.textContent = `다운로드 실패: ${res?.error || '알 수 없는 오류'}`;
      }
    } catch (err) {
      updateStatusText.textContent = `다운로드 에러: ${err.message || err}`;
    }
  });

  window.characterTodo.onUpdateAvailable((info) => {
    if (updateVersionTag) {
      updateVersionTag.textContent = info.version || 'v2.5.4';
    }
    updateModal.style.display = 'flex';
    updateInfoView.style.display = 'block';
    updateProgressView.style.display = 'none';
  });

  window.characterTodo.onUpdateProgress((progress) => {
    updateModal.style.display = 'flex';
    updateInfoView.style.display = 'none';
    updateProgressView.style.display = 'block';

    const pct = progress.percent || 0;
    updateStatusText.textContent = `업데이트 다운로드 중... (${pct}%)`;
    updateProgressFill.style.width = `${pct}%`;

    const transferredMB = ((progress.transferred || 0) / (1024 * 1024)).toFixed(1);
    const totalMB = ((progress.total || 0) / (1024 * 1024)).toFixed(1);
    const speedKB = Math.round((progress.bytesPerSecond || 0) / 1024);

    updateProgressSize.textContent = `${transferredMB} MB / ${totalMB} MB`;
    updateProgressSpeed.textContent = `${speedKB} KB/s`;
  });

  window.characterTodo.onUpdateDownloaded(() => {
    updateModal.style.display = 'flex';
    updateInfoView.style.display = 'none';
    updateProgressView.style.display = 'block';

    updateStatusText.textContent = '🎉 다운로드 완료! 업데이트를 설치하고 앱을 재실행합니다...';
    updateProgressFill.style.width = '100%';
  });

  window.characterTodo.onUpdateError((error) => {
    console.error('Update error:', error);
  });
}

// Speech Bubble Logic
const speechBubble = document.querySelector('.speech-bubble');
const speechText = document.querySelector('.speech-text');
let speechTimer = null;

const encouragementMessages = [
  '오늘도 화이팅이에요! ✨',
  '할일 완료! 정말 대단해요! 🎉',
  '하나씩 차근차근 해봐요! 💪',
  '오늘 하루도 응원할게요! 🌟',
  '완벽해요! 쉬어가면서 하세요 ☕',
  '멋져요! 오늘도 리듬타서 쓱쓱~ 🎵',
  '기분 좋은 하루 되세요! 🌸'
];

function showSpeechBubble(message) {
  if (!speechBubble || !speechText) return;
  const msg = message || encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
  speechText.textContent = msg;
  speechBubble.style.display = 'block';

  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    speechBubble.style.display = 'none';
  }, 3500);
}

if (characterButton) {
  characterButton.addEventListener('click', () => {
    if (widget.dataset.hasOverdue === 'true') {
      showSpeechBubble('지남 할일이 있어요! 함께 정리해볼까요? ⏰');
    } else {
      showSpeechBubble();
    }
  });
}

// Integrated Settings Modal & Character Selector Logic
const settingsModal = document.getElementById('settings-modal');
const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
const settingsGeminiKeyInput = document.getElementById('settings-gemini-key');
const settingsGeminiSaveBtn = document.getElementById('settings-gemini-save-btn');
const charCards = document.querySelectorAll('.char-card');
const characterCustomImg = document.querySelector('.character-custom');

function applyCharacter(charId) {
  const selected = charId || 'blowfish';
  localStorage.setItem('selected-character', selected);

  charCards.forEach((card) => {
    if (card.dataset.char === selected) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  if (selected === 'blowfish') {
    widget.removeAttribute('data-character');
    if (characterCustomImg) {
      characterCustomImg.style.display = 'none';
      characterCustomImg.src = '';
    }
  } else {
    widget.setAttribute('data-character', 'custom');
    if (characterCustomImg) {
      characterCustomImg.src = `../assets/char-${selected}.png`;
      characterCustomImg.style.display = 'block';
    }
  }
}

async function loadGeminiKeyIntoSettings() {
  if (window.characterTodo?.getGeminiKey && settingsGeminiKeyInput) {
    try {
      const key = await window.characterTodo.getGeminiKey();
      settingsGeminiKeyInput.value = key || '';
    } catch {
      // ignore
    }
  }
}

function initSettingsModal() {
  const savedChar = localStorage.getItem('selected-character') || 'blowfish';
  applyCharacter(savedChar);

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await loadGeminiKeyIntoSettings();
      settingsModal.style.display = 'flex';
    });
  }

  if (settingsModalCloseBtn && settingsModal) {
    settingsModalCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsModal.style.display = 'none';
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  if (settingsGeminiSaveBtn && settingsGeminiKeyInput) {
    settingsGeminiSaveBtn.addEventListener('click', async () => {
      const key = settingsGeminiKeyInput.value.trim();
      if (window.characterTodo?.setGeminiKey) {
        const ok = await window.characterTodo.setGeminiKey(key);
        if (ok) {
          showSpeechBubble('Gemini API 키가 저장되었습니다! 🔑');
        } else {
          showSpeechBubble('API 키 저장 실패!');
        }
      }
      settingsModal.style.display = 'none';
    });
  }

  charCards.forEach((card) => {
    card.addEventListener('click', () => {
      const charId = card.dataset.char;
      applyCharacter(charId);
      showSpeechBubble('새로운 캐릭터로 변경되었어요! 🎨');
    });
  });
}

initAutoUpdateUI();
initSettingsModal();



