import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  startSignalingServer: () => ipcRenderer.invoke('start-signaling-server'),
  stopSignalingServer: () => ipcRenderer.invoke('stop-signaling-server'),
  isSignalingServerRunning: () => ipcRenderer.invoke('is-signaling-server-running'),
});
