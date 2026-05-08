import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  onDeepLink: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('deep-link', listener);
    // Returns a cleanup function the caller can invoke to unsubscribe
    return () => ipcRenderer.off('deep-link', listener);
  },
});
