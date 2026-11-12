const { app, BrowserWindow, Menu, dialog, net, session, shell } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { randomBytes, webcrypto } = require('node:crypto');

const ORIGIN = 'http://animer.localhost';
if (process.env.ANIMER_PROFILE_DIR) app.setPath('userData', process.env.ANIMER_PROFILE_DIR);
app.setName('Animer');
app.enableSandbox();
let window;
function external(value) {
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) shell.openExternal(url.href); } catch {}
}
async function signingKey() {
  const directory = app.getPath('userData');
  await mkdir(directory, { recursive: true });
  const file = join(directory, 'media-key');
  try { await writeFile(file, randomBytes(32).toString('base64'), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const key = (await readFile(file, 'utf8')).trim();
  if (Buffer.from(key, 'base64').length !== 32) throw new Error('Configuration locale du relais invalide.');
  return key;
}
async function start() {
  globalThis.crypto ||= webcrypto;
  const { default: worker } = await import(pathToFileURL(join(__dirname, 'worker.mjs')).href);
  const env = { STREAM_SIGNING_KEY: await signingKey() };
  const browserSession = session.fromPartition('persist:animer');
  // A virtual localhost origin keeps localStorage stable without opening a TCP port.
  await browserSession.protocol.handle('http', async request => {
    if (new URL(request.url).origin !== ORIGIN) return net.fetch(request, { bypassCustomProtocolHandlers: true });
    try { return await worker.fetch(request, env, { waitUntil: promise => promise.catch(() => {}) }); }
    catch { return new Response('Le relais local ne peut pas traiter cette requête.', { status: 500 }); }
  });
  browserSession.setPermissionRequestHandler((contents, permission, callback) => callback(contents.getURL().startsWith(ORIGIN + '/') && ['fullscreen', 'clipboard-sanitized-write'].includes(permission)));
  browserSession.setPermissionCheckHandler((_contents, permission, origin) => origin === ORIGIN && ['fullscreen', 'clipboard-sanitized-write'].includes(permission));
  window = new BrowserWindow({ width: 1280, height: 850, minWidth: 360, minHeight: 500, show: false, backgroundColor: '#17151a', title: 'Animer', icon: join(__dirname, 'icon.png'), webPreferences: { session: browserSession, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false } });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => { try { if (new URL(url).origin === ORIGIN) return; } catch {} event.preventDefault(); external(url); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Animer', submenu: [{ label: 'Paramètres et sauvegarde', accelerator: 'CmdOrCtrl+,', click: () => window.loadURL(ORIGIN + '/#/settings') }, { type: 'separator' }, { role: 'quit', label: 'Quitter' }] },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Affichage', submenu: [{ role: 'reload', label: 'Actualiser' }, { role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
    { label: 'Aide', submenu: [{ label: 'Ouvrir le site Animer', click: () => external('https://jfdedit3.github.io/Animer/') }] },
  ]));
  await window.loadURL(ORIGIN + '/#/');
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(start).catch(error => { dialog.showErrorBox('Animer ne peut pas démarrer', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
