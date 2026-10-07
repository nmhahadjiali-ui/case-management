// CaseFlow desktop app: a window around the CaseFlow website.
// The site address lives in app.config.json (override with CASEFLOW_URL for testing).

const { app, BrowserWindow, Menu, dialog, shell } = require("electron")
const path = require("node:path")
const config = require("./app.config.json")

const APP_URL = process.env.CASEFLOW_URL || config.url
const APP_ORIGIN = new URL(APP_URL).origin
const ICON = path.join(__dirname, "build", "icon.png")

let win = null

const isAppUrl = (url) => {
  try {
    return new URL(url).origin === APP_ORIGIN
  } catch {
    return false
  }
}

function showOffline(reason) {
  win.loadFile(path.join(__dirname, "offline.html"), { query: { url: APP_URL, reason: reason || "" } })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: "CaseFlow",
    icon: ICON,
    backgroundColor: "#ffffff",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  })

  win.once("ready-to-show", () => win.show())

  // Pop-ups and links to other sites open in the user's normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: "allow" }
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url)
    return { action: "deny" }
  })
  win.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url.startsWith("file:")) return
    event.preventDefault()
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url)
  })

  // No connection (or the site is down): show the offline page with a Retry button.
  win.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 /* aborted by a redirect */ && isAppUrl(url)) showOffline(description)
  })

  win.loadURL(APP_URL)
}

function buildMenu() {
  const template = [
    { label: "File", submenu: [{ role: "quit", label: "Exit" }] },
    {
      label: "View",
      submenu: [
        { label: "Home", accelerator: "Alt+Home", click: () => win && win.loadURL(APP_URL) },
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Open in browser", click: () => shell.openExternal(APP_URL) },
        { type: "separator" },
        {
          label: "About CaseFlow",
          click: () =>
            dialog.showMessageBox(win, {
              type: "info",
              title: "About CaseFlow",
              icon: ICON,
              message: "CaseFlow — Case Management System",
              detail: `Version ${app.getVersion()}\nDeveloped by Nahed M. Hadji Ali\n© 2026 CaseFlow. All rights reserved.\n\n${APP_URL}`,
            }),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Only one copy of the app; opening it again focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  app.whenReady().then(() => {
    app.setAppUserModelId("com.nahedhadjiali.caseflow")
    buildMenu()
    createWindow()
  })
  app.on("window-all-closed", () => app.quit())
}
