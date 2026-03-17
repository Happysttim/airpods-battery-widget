import { BrowserWindow, Menu, Tray, ipcMain, app, screen } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AirpodsBluetooth, type Finger } from 'airpods-bluetooth';
import type { Config } from './types/config';

const BROWSER_PATH = app.isPackaged
  ? path.resolve('../renderer')
  : 'http://localhost:5173';

class App {
  private systemTray: Tray | null = null;
  private listWindow: BrowserWindow | null = null;
  private airpodsWidget: BrowserWindow | null = null;
  private airpodsBluetooth: AirpodsBluetooth | null = null;
  private config: Config | null = null;
  private selectedFinger: Finger | null = null;
  private selectedAdapter: number | null = null;
  private scanInterval: NodeJS.Timeout | null = null;

  private nearTray(win: BrowserWindow) {
    if (!this.systemTray) {
      return { x: 0, y: 0 };
    }
    const trayBounds = this.systemTray.getBounds();
    const winBounds = win.getBounds();
    const display = screen.getDisplayNearestPoint({
      x: trayBounds.x,
      y: trayBounds.y,
    });
    const { workArea } = display;
    const x = workArea.width - winBounds.width;
    const y = workArea.height - winBounds.height;
    win.setPosition(x, y);
  }

  async loadConfig() {
    const configPath = path.join(__dirname, '../../assets/config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    this.config = JSON.parse(configContent) as Config;
  }

  async saveConfig() {
    if (!this.config) {
      return;
    }
    const configPath = path.join(__dirname, '../../assets/config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8',
    );
  }

  constructor() {
    this.airpodsBluetooth = new AirpodsBluetooth();
    this.airpodsBluetooth.interval = 2000;
  }

  initWidget() {
    this.airpodsWidget = new BrowserWindow({
      width: this.config?.width ?? 800,
      height: this.config?.height ?? 600,
      x: this.config?.x ?? 0,
      y: this.config?.y ?? 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      resizable: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload: path.join(__dirname, '../preload/index.mjs'),
      },
    });

    this.airpodsWidget.on('move', () => {
      if (!this.config) {
        return;
      }

      const { x, y } = this.airpodsWidget!.getBounds();
      this.config.x = x;
      this.config.y = y;
      this.saveConfig();
    });

    this.airpodsWidget.on('resize', () => {
      if (!this.config) {
        return;
      }
      const { width, height } = this.airpodsWidget!.getBounds();
      this.config.width = width;
      this.config.height = height;
      this.saveConfig();
    });

    if (!app.isPackaged) {
      this.airpodsWidget.loadURL(`${BROWSER_PATH}/widget.html`);
      this.airpodsWidget.webContents.openDevTools({ mode: 'detach' });
    } else {
      this.airpodsWidget.loadFile(`${BROWSER_PATH}/widget.html`);
    }
  }

  initListWindow() {
    this.listWindow = new BrowserWindow({
      width: 400,
      height: 600,
      useContentSize: true,
      resizable: false,
      frame: false,
      transparent: true,
      focusable: true,
      alwaysOnTop: true,
      fullscreenable: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload: path.join(__dirname, '../preload/index.mjs'),
      },
    });

    if (!app.isPackaged) {
      this.listWindow.loadURL(`${BROWSER_PATH}/list.html`);
      this.listWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      this.listWindow.loadFile(`${BROWSER_PATH}/list.html`);
    }
  }

  initTray() {
    this.systemTray = new Tray(
      path.join(__dirname, '../../assets/tray-icon.png'),
    );
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show AirPods Battery',
        click: () => {
          if (!this.airpodsBluetooth || !this.config || !this.selectedFinger) {
            return;
          }
          if (!this.airpodsWidget) {
            this.initWidget();
          }
          this.airpodsWidget?.show();
        },
      },
      {
        label: 'Show AirPods List',
        click: () => {
          if (!this.airpodsBluetooth || !this.config) {
            return;
          }
          if (!this.listWindow) {
            this.initListWindow();
          }
          this.listWindow?.show();
        },
      },
      {
        label: 'Quit',
        click: () => {
          if (!this.airpodsBluetooth) {
            process.exit(0);
          }
          if (this.airpodsBluetooth.isScan()) {
            this.airpodsBluetooth?.stopScan();
          }
          process.exit(0);
        },
      },
    ]);
    this.systemTray.setContextMenu(contextMenu);
  }

  initHook() {
    ipcMain.on('start-scan', () => {
      if (!this.airpodsBluetooth || this.scanInterval) {
        return;
      }

      this.scanInterval = setInterval(() => {
        if (this.airpodsBluetooth?.isScan()) {
          return;
        }
        this.airpodsBluetooth?.startScan();
      }, this.config?.scanInterval ?? 5000);
    });

    ipcMain.on('stop-scan', () => {
      if (!this.airpodsBluetooth || !this.scanInterval) {
        return;
      }
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      this.airpodsBluetooth.stopScan();
    });

    ipcMain.handle('is-scan', () => {
      if (!this.airpodsBluetooth) {
        return false;
      }
      return this.airpodsBluetooth.isScan();
    });

    ipcMain.handle('fingers', () => {
      if (!this.airpodsBluetooth) {
        return [];
      }
      return this.airpodsBluetooth.fingers();
    });

    ipcMain.handle('adapters', () => {
      if (!this.airpodsBluetooth) {
        return [];
      }
      return this.airpodsBluetooth.scanAdapters();
    });

    ipcMain.on('set-adapter', (_, idx: number) => {
      if (!this.airpodsBluetooth) {
        return;
      }

      this.selectedAdapter = idx;
      this.airpodsBluetooth.setAdapter(idx);
    });

    ipcMain.on('set-interval', (_, interval: number) => {
      if (!this.config) {
        return;
      }
      this.config.scanInterval = interval;
      this.saveConfig();
    });

    ipcMain.on('update-widget', (_, finger: Finger) => {
      this.selectedFinger = finger;
      if (this.airpodsWidget) {
        this.airpodsWidget.webContents.send('update-finger', finger);
      }
    });

    ipcMain.on('create-widget', () => {
      if (!this.airpodsBluetooth || !this.config || !this.selectedFinger) {
        return;
      }
      if (!this.airpodsWidget) {
        this.initWidget();
      }
      this.airpodsWidget?.show();
    });

    ipcMain.on(
      'resize-to-content',
      (_, height: number, type: 'widget' | 'list') => {
        const contentSize = () => {
          if (type === 'widget') {
            return this.airpodsWidget?.getContentSize();
          }
          return this.listWindow?.getContentSize();
        };
        const [width] = contentSize() ?? [0, 0];
        if (type === 'widget') {
          this.airpodsWidget?.setContentSize(width, height);
          this.nearTray(this.airpodsWidget!);
        } else {
          this.listWindow?.setContentSize(width, height);
          this.nearTray(this.listWindow!);
        }
      },
    );

    ipcMain.handle('selected-adapter', () => {
      if (this.selectedAdapter === null) {
        return 0;
      }
      return this.selectedAdapter;
    });
  }

  showWidget() {
    this.airpodsWidget?.show();
  }

  showListWindow() {
    this.listWindow?.show();
  }
}

export default App;
