import { app, BrowserWindow, globalShortcut, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import { SignalingServer } from './signaling-server';

let signalingServer: SignalingServer | null = null;

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  // Show dialog to user
  const dialogOpts = {
    type: 'info' as const,
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: 'A new version has been downloaded. Restart the application to apply the update.',
    detail: `Version ${info.version} is now available. The application will restart to apply the update.`
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

const createWindow = (): void => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // DevTools disabled - use our custom developer console instead
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // DevTools disabled - use our custom developer console instead
  }

  // Setup IPC handlers for signaling server
  setupIPC(mainWindow);
};

// Setup IPC handlers for signaling server control
const setupIPC = (mainWindow: BrowserWindow) => {
  // Start signaling server
  ipcMain.handle('start-signaling-server', async () => {
    try {
      if (!signalingServer) {
        signalingServer = new SignalingServer(3001);
      }
      
      if (!signalingServer.isServerRunning()) {
        await signalingServer.start();
        console.log('Signaling server started from main process');
        return { success: true };
      } else {
        console.log('Signaling server already running');
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to start signaling server:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Stop signaling server
  ipcMain.handle('stop-signaling-server', async () => {
    try {
      if (signalingServer && signalingServer.isServerRunning()) {
        await signalingServer.stop();
        console.log('Signaling server stopped from main process');
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to stop signaling server:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Check if signaling server is running
  ipcMain.handle('is-signaling-server-running', () => {
    return signalingServer ? signalingServer.isServerRunning() : false;
  });

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { success: true, result };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  // Check for updates after app is ready (only in production)
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000); // Wait 3 seconds before checking for updates
  }
  
  // DevTools shortcuts disabled - use our custom developer console instead
  // Global shortcuts removed: F12 and CmdOrCtrl+Shift+I
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', async () => {
  // Stop signaling server
  if (signalingServer && signalingServer.isServerRunning()) {
    await signalingServer.stop();
    console.log('Signaling server stopped on app exit');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
