import {
  type Finger,
  type Adapter,
  DeviceModel,
  DeviceUtp,
  DeviceMode,
  DeviceColor,
} from 'airpods-bluetooth';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const modelToString = (model: DeviceModel) => {
  switch (model) {
    case DeviceModel.AirPods1:
      return 'AirPods 1';
    case DeviceModel.AirPods2:
      return 'AirPods 2';
    case DeviceModel.AirPods3:
      return 'AirPods 3';
    case DeviceModel.AirPodsPro:
      return 'AirPods Pro';
    case DeviceModel.AirPodsPro2:
      return 'AirPods Pro 2';
    case DeviceModel.AirPodsMax:
      return 'AirPods Max';
    case DeviceModel.Unknown:
      return 'Unknown Model';
  }
};

const utpToString = (utp: DeviceUtp) => {
  switch (utp) {
    case DeviceUtp.OneInEar:
      return 'One In Ear';
    case DeviceUtp.BothCase:
      return 'Both Case';
    case DeviceUtp.BothEar:
      return 'Both Ear';
    case DeviceUtp.OneInCase:
      return 'One In Case';
    case DeviceUtp.Unknown:
      return 'Unknown UTP';
  }
};

const modeToString = (mode: DeviceMode) => {
  switch (mode) {
    case DeviceMode.Paired:
      return 'Paired';
    case DeviceMode.Pairing:
      return 'Pairing';
    case DeviceMode.Unknown:
      return 'Unknown';
  }
};

const colorToString = (color: DeviceColor) => {
  switch (color) {
    case DeviceColor.White:
      return 'White';
    case DeviceColor.Black:
      return 'Black';
    case DeviceColor.Red:
      return 'Red';
    case DeviceColor.Blue:
      return 'Blue';
    case DeviceColor.Pink:
      return 'Pink';
    case DeviceColor.Gray:
      return 'Gray';
    case DeviceColor.Silver:
      return 'Silver';
    case DeviceColor.Gold:
      return 'Gold';
    case DeviceColor.RoseGold:
      return 'RoseGold';
    case DeviceColor.SpaceGray:
      return 'SpaceGray';
    case DeviceColor.DarkBlue:
      return 'DarkBlue';
    case DeviceColor.LightBlue:
      return 'LightBlue';
    case DeviceColor.Yellow:
      return 'Yellow';
    case DeviceColor.Unknown:
      return 'Unknown';
  }
};

contextBridge.exposeInMainWorld('backend', {
  startScan: () => ipcRenderer.send('start-scan'),
  stopScan: () => ipcRenderer.send('stop-scan'),
  isScan: (): Promise<boolean> => ipcRenderer.invoke('is-scan'),
  fingers: (): Promise<Record<string, Finger>> => ipcRenderer.invoke('fingers'),
  adapters: (): Promise<Adapter[]> => ipcRenderer.invoke('adapters'),
  setAdapter: (idx: number) => ipcRenderer.send('set-adapter', idx),
  setInterval: (interval: number) => ipcRenderer.send('set-interval', interval),
  updateWidget: (finger: Finger) => ipcRenderer.send('update-widget', finger),
  onUpdate: (listener: (event: IpcRendererEvent, finger: Finger) => void) =>
    ipcRenderer.on('update-finger', listener),
  removeListener: (
    listener: (event: IpcRendererEvent, finger: Finger) => void,
  ) => ipcRenderer.removeListener('update-finger', listener),
  createWidget: () => ipcRenderer.send('create-widget'),
  resizeToContent: (height: number, type: 'widget' | 'list') =>
    ipcRenderer.send('resize-to-content', height, type),
  myAdapterNumber: (): Promise<number> =>
    ipcRenderer.invoke('selected-adapter'),
  colorToString: (color: DeviceColor) => colorToString(color),
  modelToString: (model: DeviceModel) => modelToString(model),
  utpToString: (utp: DeviceUtp) => utpToString(utp),
  modeToString: (mode: DeviceMode) => modeToString(mode),
});
