import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
} from "electron";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerModelCatalogHandlers } from "./modelCatalog";

const APP_SCHEME = "zynalo";
const APP_HOST = "app";
const DEVELOPMENT_URL = process.env.ELECTRON_RENDERER_URL;
const DEBUGGING_PORT = process.env.ZYNALO_DEBUG_PORT;

if (DEBUGGING_PORT && /^\d+$/.test(DEBUGGING_PORT)) {
  app.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1");
  app.commandLine.appendSwitch("remote-debugging-port", DEBUGGING_PORT);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const desktopRoot = () =>
  app.isPackaged
    ? path.resolve(process.resourcesPath, "out")
    : path.resolve(__dirname, "..", "out");

const hasFileExtension = (filePath: string) =>
  path.posix.basename(filePath).includes(".");

const resolveDesktopAsset = async (requestUrl: string) => {
  const url = new URL(requestUrl);
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return null;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const relativePath = pathname.replace(/^\/+/, "");
  const requestedPath = relativePath || "index.html";
  const candidates = hasFileExtension(requestedPath)
    ? [requestedPath]
    : [path.join(requestedPath, "index.html"), `${requestedPath}.html`];
  const root = desktopRoot();

  for (const candidate of candidates) {
    const absolutePath = path.resolve(root, candidate);
    if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
      continue;
    }

    try {
      if ((await stat(absolutePath)).isFile()) return absolutePath;
    } catch {
      // Try the next static-export path shape.
    }
  }

  return null;
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:* ws://127.0.0.1:*",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const registerDesktopProtocol = () => {
  protocol.handle(APP_SCHEME, async (request) => {
    const assetPath = await resolveDesktopAsset(request.url);
    if (!assetPath) {
      return new Response("Not found", { status: 404 });
    }

    const response = await net.fetch(pathToFileURL(assetPath).toString());
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", contentSecurityPolicy);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
};

const isTrustedRenderer = (urlValue: string) => {
  try {
    const url = new URL(urlValue);
    if (DEVELOPMENT_URL) {
      return url.origin === new URL(DEVELOPMENT_URL).origin;
    }
    return url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST;
  } catch {
    return false;
  }
};

const registerIpcHandlers = () => {
  ipcMain.handle("app:get-info", (event) => {
    if (!event.senderFrame || !isTrustedRenderer(event.senderFrame.url)) {
      throw new Error("Rejected IPC request from an untrusted renderer.");
    }

    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
    };
  });
};

const openExternalUrl = async (urlValue: string) => {
  try {
    const url = new URL(urlValue);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      await shell.openExternal(url.toString());
    }
  } catch {
    // Invalid and unsupported external URLs are intentionally ignored.
  }
};

const createMainWindow = async () => {
  const windowIcon = app.isPackaged
    ? path.join(process.resourcesPath, "zynalo-studio.ico")
    : path.resolve(__dirname, "..", "public", "zynalo-studio.ico");
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#111827",
    icon: windowIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isTrustedRenderer(url)) return;
    event.preventDefault();
    void openExternalUrl(url);
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (DEVELOPMENT_URL) {
    await mainWindow.loadURL(DEVELOPMENT_URL);
  } else {
    await mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/studio/`);
  }
};

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  if (!DEVELOPMENT_URL) registerDesktopProtocol();

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowClipboardWrite =
      permission === "clipboard-sanitized-write" &&
      isTrustedRenderer(webContents.getURL());
    callback(allowClipboardWrite);
  });

  registerIpcHandlers();
  registerModelCatalogHandlers(isTrustedRenderer);
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
