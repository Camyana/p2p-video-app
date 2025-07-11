"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const signaling_server_1 = require("./signaling-server");
let signalingServer = null;
// Configure auto-updater
electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
// Auto-updater event handlers
electron_updater_1.autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});
electron_updater_1.autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
});
electron_updater_1.autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
});
electron_updater_1.autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater:', err);
});
electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    // Show dialog to user
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: 'A new version has been downloaded. Restart the application to apply the update.',
        detail: `Version ${info.version} is now available. The application will restart to apply the update.`
    };
    electron_1.dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0)
            electron_updater_1.autoUpdater.quitAndInstall();
    });
});
const createWindow = () => {
    // Create the browser window
    const mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        // DevTools disabled - use our custom developer console instead
    }
    // Setup IPC handlers for signaling server
    setupIPC(mainWindow);
};
// Setup IPC handlers for signaling server control
const setupIPC = (mainWindow) => {
    // Start signaling server
    electron_1.ipcMain.handle('start-signaling-server', async () => {
        try {
            if (!signalingServer) {
                signalingServer = new signaling_server_1.SignalingServer(3001);
            }
            if (!signalingServer.isServerRunning()) {
                await signalingServer.start();
                console.log('Signaling server started from main process');
                return { success: true };
            }
            else {
                console.log('Signaling server already running');
                return { success: true };
            }
        }
        catch (error) {
            console.error('Failed to start signaling server:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Stop signaling server
    electron_1.ipcMain.handle('stop-signaling-server', async () => {
        try {
            if (signalingServer && signalingServer.isServerRunning()) {
                await signalingServer.stop();
                console.log('Signaling server stopped from main process');
            }
            return { success: true };
        }
        catch (error) {
            console.error('Failed to stop signaling server:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    // Check if signaling server is running
    electron_1.ipcMain.handle('is-signaling-server-running', () => {
        return signalingServer ? signalingServer.isServerRunning() : false;
    });
    // Auto-updater IPC handlers
    electron_1.ipcMain.handle('check-for-updates', async () => {
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
            return { success: true, result };
        }
        catch (error) {
            console.error('Error checking for updates:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('get-app-version', () => {
        return electron_1.app.getVersion();
    });
};
// This method will be called when Electron has finished initialization
electron_1.app.whenReady().then(() => {
    createWindow();
    // Check for updates after app is ready (only in production)
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
        setTimeout(() => {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
        }, 3000); // Wait 3 seconds before checking for updates
    }
    // DevTools shortcuts disabled - use our custom developer console instead
    // Global shortcuts removed: F12 and CmdOrCtrl+Shift+I
});
// Quit when all windows are closed, except on macOS
electron_1.app.on('window-all-closed', async () => {
    // Stop signaling server
    if (signalingServer && signalingServer.isServerRunning()) {
        await signalingServer.stop();
        console.log('Signaling server stopped on app exit');
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
