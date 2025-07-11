import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  startSignalingServer: () => ipcRenderer.invoke('start-signaling-server'),
  stopSignalingServer: () => ipcRenderer.invoke('stop-signaling-server'),
  isSignalingServerRunning: () => ipcRenderer.invoke('is-signaling-server-running'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
