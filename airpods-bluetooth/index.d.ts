declare enum DeviceModel {
  Unknown = 0xffff,
  AirPods1 = 0x0220,
  AirPods2 = 0x0f20,
  AirPods3 = 0x1320,
  AirPodsPro = 0x0e20,
  AirPodsPro2 = 0x1420,
  AirPodsMax = 0x0a20,
}

declare enum DeviceUtp {
  OneInEar = 0x00,
  BothCase = 0x01,
  BothEar = 0x02,
  OneInCase = 0x03,
  Unknown = 0xff,
}

declare enum DeviceMode {
  Pairing = 0x00,
  Paired = 0x01,
  Unknown = 0xff,
}

declare enum DeviceColor {
  White = 0x00,
  Black = 0x01,
  Red = 0x02,
  Blue = 0x03,
  Pink = 0x04,
  Gray = 0x05,
  Silver = 0x06,
  Gold = 0x07,
  RoseGold = 0x08,
  SpaceGray = 0x09,
  DarkBlue = 0x0a,
  LightBlue = 0x0b,
  Yellow = 0x0c,
  Unknown = 0xff,
}

declare interface DeviceBattery {
  leftPercent: number;
  rightPercent: number;
  casePercent: number;

  leftCharging: boolean;
  rightCharging: boolean;
  caseCharging: boolean;
}

declare interface Adapter {
  index: number;
  identifier: string;
  address: string;
  bluetoothEnabled: boolean;
}

declare interface Finger {
  battery: DeviceBattery;
  color: DeviceColor;
  model: DeviceModel;
  utp: DeviceUtp;
  mode: DeviceMode;
  rssi: number;
  timestamp?: number;
}

declare class AirpodsBluetooth {
  constructor();
  scanAdapters(): Adapter[];
  setAdapter(idx: number): void;
  startScan(): void;
  stopScan(): void;
  fingers(): Map<number, Finger>;
  isScan(): boolean;
  onScanFound(found: (finger: Finger) => void): void;
  startClean(): void;
  stopClean(): void;

  public interval: number;
  public cleanUp: number;
}

export {
  DeviceBattery,
  DeviceColor,
  DeviceMode,
  DeviceModel,
  DeviceUtp,
  Adapter,
  Finger,
  AirpodsBluetooth,
};
