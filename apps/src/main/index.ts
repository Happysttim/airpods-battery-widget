import { app } from 'electron';
import App from './app';
import path from 'node:path';
import fs from 'node:fs';

const defaultConfigPath = () => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'defaults', 'config.json')
    : path.join(process.cwd(), 'resources', 'config.json');
};

const userConfigPath = () => {
  return path.join(app.getPath('userData'), 'config.json');
};

const ensureConfig = () => {
  const target = userConfigPath();
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(defaultConfigPath(), target);
  }
  return target;
};

app.whenReady().then(async () => {
  const configPath = ensureConfig();
  const mainApp = new App(configPath);
  await mainApp.loadConfig();
  mainApp.initHook();
  mainApp.initTray();
  mainApp.initListWindow();
});
