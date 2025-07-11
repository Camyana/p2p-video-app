// IPC interface for renderer process to communicate with main process
declare global {
  interface Window {
    electronAPI: {
      startSignalingServer: () => Promise<{ success: boolean; error?: string }>;
      stopSignalingServer: () => Promise<{ success: boolean; error?: string }>;
      isSignalingServerRunning: () => Promise<boolean>;
    };
  }
}

export {};
