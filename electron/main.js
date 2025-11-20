// Electron Main Process
import { app, BrowserWindow, ipcMain, nativeTheme, shell, dialog, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let backendProcess = null;

// Ensure single instance of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running; quit this one immediately
  app.quit();
} else {
  // Focus existing window on second instance
  app.on('second-instance', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      try { splashWindow.show(); splashWindow.focus(); } catch {}
      return;
    }
    if (mainWindow) {
      try {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } catch {}
    }
  });
}

const isDev = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;

function resolveBackendEntry() {
  // In dev, run from project server folder
  if (isDev) {
    return path.join(__dirname, '..', 'server', 'index.js');
  }
  // In production, try realistic locations depending on electron-builder packing
  const candidates = [
    // Preferred: server unpacked alongside app.asar
    path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.js'),
    // Sometimes packaged under app (if not unpacked)
    path.join(process.resourcesPath, 'app', 'server', 'index.js'),
    // Fallback (dev-like)
    path.join(__dirname, '..', 'server', 'index.js'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  // Return the first as a best-effort fallback
  return candidates[0];
}

function startBackend() {
  const entry = resolveBackendEntry();
  const env = { ...process.env };
  // Use 5002 in both dev and production unless overridden
  env.PORT = env.PORT || '5002';

  // Set working directory so dotenv and relative paths work
  const cwd = isDev
    ? path.join(__dirname, '..', 'server')
    : fs.existsSync(path.join(process.resourcesPath, 'app.asar.unpacked', 'server'))
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server')
      : path.join(process.resourcesPath, 'app', 'server');

  // In production, use Electron binary in Node mode to run the backend script
  // This avoids launching another Electron app instance.
  const nodeExec = process.execPath;
  if (!isDev) env.ELECTRON_RUN_AS_NODE = '1';

  backendProcess = spawn(nodeExec, [entry], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    cwd,
  });

  // Write backend logs to file for diagnostics in production
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
    const logFile = path.join(logsDir, 'backend.log');
    const append = (tag, chunk) => {
      try {
        const line = `[${new Date().toISOString()}][${tag}] ${chunk.toString()}`;
        fs.appendFileSync(logFile, line);
      } catch {}
    };
    backendProcess.stdout?.on('data', (d) => append('OUT', d));
    backendProcess.stderr?.on('data', (d) => append('ERR', d));
  } catch {}


  backendProcess.on('error', (err) => {
    console.error('[backend] failed to start:', err);
  });
  backendProcess.on('exit', (code, signal) => {
    console.log('[backend] exited', { code, signal });
  });
}

function waitForBackend(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1500 }, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          res.resume();
          return resolve(true);
        }
        res.resume();
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { try { req.destroy(); } catch {} retry(); });
      function retry() {
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(attempt, 500);
      }
    };
    attempt();
  });
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  splashWindow.once('ready-to-show', () => splashWindow.show());
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b1117' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable native window.open so print previews and popups can open safely
      nativeWindowOpen: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
  });

  if (isDev) {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    mainWindow.loadURL(devURL);
    // Only open DevTools if explicitly requested
    if (process.env.ELECTRON_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    try {
      if (!fs.existsSync(indexPath)) {
        dialog.showErrorBox(
          'Application files missing',
          'The application UI files were not found (dist/index.html is missing).\n\nPlease rebuild the app using "npm run build" then create the installer with "npm run dist:win".'
        );
        // Close splash if visible and quit to avoid blank window hanging
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        app.quit();
        return;
      }
    } catch {}
    mainWindow.loadFile(indexPath);
  }

  // Allow app popups (about:blank or same-origin) for print previews; external links go to default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    const isAppUrl = !url || url === 'about:blank' || url.startsWith('file://') || url.startsWith(devURL);
    if (isAppUrl) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            // Harden child windows
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }
    try { if (/^https?:\/\//i.test(url)) shell.openExternal(url); } catch {}
    return { action: 'deny' };
  });

  // Optional hardening: prevent navigation away from app's index except dev URL
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    const isAppFile = url.startsWith('file://') || url.startsWith(devURL);
    if (!isAppFile) {
      e.preventDefault();
      try { if (/^https?:\/\//i.test(url)) shell.openExternal(url); } catch {}
    }
  });

  // Keyboard: Ctrl+P opens the system print dialog for the current page
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && !input.alt && !input.shift && input.type === 'keyDown' && input.key?.toLowerCase() === 'p') {
      event.preventDefault();
      try {
        mainWindow.webContents.print({ printBackground: true, silent: false });
      } catch (e) {
        console.warn('Print failed from shortcut:', e);
      }
    }
  });

  // Note: do not override window.open so the app can open print previews/popups as intended
}

// IPC: Printing helpers
ipcMain.handle('print:current', async (event, options = {}) => {
  const wc = event?.sender;
  if (!wc) return { ok: false, error: 'No sender' };
  return new Promise((resolve) => {
    try {
      wc.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    } catch (e) {
      resolve({ ok: false, error: e?.message || String(e) });
    }
  });
});

ipcMain.handle('print:html', async (_event, html, options = {}) => {
  if (typeof html !== 'string' || !html.trim()) return { ok: false, error: 'Invalid HTML' };
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await new Promise((resolve) => {
      win.webContents.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        try { win.close(); } catch {}
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    });
  } catch (e) {
    try { win.close(); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('print:url', async (_event, url, options = {}) => {
  if (typeof url !== 'string' || !url.trim()) return { ok: false, error: 'Invalid URL' };
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await win.loadURL(url);
    return await new Promise((resolve) => {
      win.webContents.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        try { win.close(); } catch {}
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    });
  } catch (e) {
    try { win.close(); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
});

app.whenReady().then(async () => {
  // Redirect accidental file:///api/* requests to the local backend in Electron prod
  try {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = details.url || '';
        if (url.startsWith('file://')) {
          const idx = url.indexOf('/api/');
          if (idx !== -1) {
            const port = Number(process.env.PORT) || 5002;
            const rest = url.substring(idx + '/api'.length); // includes '/...'
            const redirectURL = `http://127.0.0.1:${port}/api${rest}`;
            return callback({ redirectURL });
          }
        }
      } catch {}
      callback({});
    });
  } catch {}

  // In production, start backend automatically. In dev, it's already started by npm script.
  if (!isDev) startBackend();

  // Show splash only in production; in dev, open main window instantly.
  if (!isDev) {
    createSplash();
    // Briefly wait for backend so first screen can login
    const ok = await waitForBackend(Number(process.env.PORT) || 5002, 8000);
    if (!ok) {
      console.warn('[backend] health check timed out; continuing to UI');
    }
  }
  createMainWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (!isDev) createSplash();
      createMainWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill(process.platform === 'win32' ? 'SIGTERM' : 'SIGINT');
    }
  } catch (e) {
    // ignore
  }
});

// Optional: allow splash to request closing itself earlier
ipcMain.handle('splash:ready', () => {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
});
