import { app } from 'electron';
import App from './app';

app.whenReady().then(async () => {
  const mainApp = new App();
  await mainApp.loadConfig();
  mainApp.initHook();
  mainApp.initTray();
  mainApp.initListWindow();
});
