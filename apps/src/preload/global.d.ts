import {
  DeviceColor,
  DeviceMode,
  DeviceModel,
  DeviceUtp,
  type Adapter,
  type Finger,
} from 'airpods-bluetooth';
import type { IpcRenderer } from 'electron';

export interface IBackEnd {
  startScan: () => void;
  stopScan: () => void;
  isScan: () => Promise<boolean>;
  fingers: () => Promise<Record<string, Finger>>;
  adapters: () => Promise<Adapter[]>;
  setAdapter: (idx: number) => void;
  getAdapter: () => Promise<number | undefined>;
  setInterval: (interval: number) => void;
  interval: () => Promise<number>;
  updateWidget: (finger: Finger) => void;
  createWidget: () => void;
  resizeToContent: (height: number, type: 'widget' | 'list') => void;
  myAdapterNumber: () => Promise<number>;
  colorToString: (color: DeviceColor) => string;
  modelToString: (model: DeviceModel) => string;
  utpToString: (utp: DeviceUtp) => string;
  modeToString: (mode: DeviceMode) => string;
  onUpdate: (
    listener: (event: IpcRendererEvent, airpods: Airpods) => void,
  ) => IpcRenderer;
  removeListener: (
    listener: (event: IpcRendererEvent, airpods: Airpods) => void,
  ) => IpcRenderer;
  getHealth: () => Promise<Airpods | undefined>;
}

declare global {
  interface Window {
    backend: IBackEnd;
  }

  declare type Airpods = Finger;
  declare type BluetoothAdapter = Adapter;
}
