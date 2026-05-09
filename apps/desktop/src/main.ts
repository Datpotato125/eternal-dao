import { app, BrowserWindow, ipcMain, shell } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import path from 'path';

if (squirrelStartup) app.quit();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const PROTOCOL = 'eternal-dao';

// Single instance lock — required for deep-link callback to reach the running window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Register custom protocol so `eternal-dao://auth/callback?code=...` redirects work
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// On Windows: second-instance fires when user clicks the deep-link while app is running
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (url) mainWindow?.webContents.send('deep-link', url);
});

// On macOS: open-url fires for deep links
app.on('open-url', (event, url) => {
  event.preventDefault();
  mainWindow?.webContents.send('deep-link', url);
});

// Allow renderer to open external URLs (for OAuth browser launch)
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
