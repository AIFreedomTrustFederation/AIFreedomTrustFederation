const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const nodeUrl = process.env.AIFT_NODE_URL || 'http://127.0.0.1:3001';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'AIFT Cloud',
    backgroundColor: '#07111f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(nodeUrl).catch(() => {
    win.loadFile(path.join(__dirname, 'fallback.html'));
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
