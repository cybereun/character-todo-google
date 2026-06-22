const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('characterTodo', {
  setExpanded: (expanded) => ipcRenderer.invoke('widget:set-expanded', expanded),
  moveBy: (dx, dy) => ipcRenderer.invoke('widget:move-by', { dx, dy }),
  loadTodos: () => ipcRenderer.invoke('todos:load'),
  saveTodos: (todos) => ipcRenderer.invoke('todos:save', todos),
  googleAuthStatus: () => ipcRenderer.invoke('google:auth-status'),
  googleLogin: () => ipcRenderer.invoke('google:login'),
  googleLogout: () => ipcRenderer.invoke('google:logout'),
  syncGoogleTasks: () => ipcRenderer.invoke('google:sync'),
  deleteGoogleTask: (id) => ipcRenderer.invoke('google:delete-task', id),
  showConfirm: (message) => ipcRenderer.invoke('google:show-confirm', message),
  onGoogleAuthSuccess: (callback) => ipcRenderer.on('google:auth-success', callback)
});
