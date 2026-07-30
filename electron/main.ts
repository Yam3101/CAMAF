import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { getDatabase, closeDatabase } from './db/database';
import { registerIpcHandlers } from './db/handlers';

const appDisplayName = 'CAMAF V1';
let mainWindow: BrowserWindow | null = null;

registerIpcHandlers();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: `${appDisplayName} - Administracion de Activos Fijos`,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  app.setName(appDisplayName);
  app.setPath('userData', join(app.getPath('appData'), appDisplayName));
  getDatabase();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});
