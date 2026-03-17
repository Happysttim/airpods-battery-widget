import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { AirpodsBluetooth } = require('./build/Release/airpods-bluetooth.node');
const createNumericEnum = (entries) => {
  const obj = {};

  for (const [key, value] of Object.entries(entries)) {
    obj[key] = value;
    obj[value] = key;
  }

  return Object.freeze(obj);
};

const DeviceModel = createNumericEnum({
  Unknown: 0xffff,
  AirPods1: 0x0220,
  AirPods2: 0x0f20,
  AirPods3: 0x1320,
  AirPodsPro: 0x0e20,
  AirPodsPro2: 0x1420,
  AirPodsMax: 0x0a20,
});

const DeviceUtp = createNumericEnum({
  OneInEar: 0x00,
  BothCase: 0x01,
  BothEar: 0x02,
  OneInCase: 0x03,
  Unknown: 0xff,
});

const DeviceMode = createNumericEnum({
  Pairing: 0x00,
  Paired: 0x01,
  Unknown: 0xff,
});

const DeviceColor = createNumericEnum({
  White: 0x00,
  Black: 0x01,
  Red: 0x02,
  Blue: 0x03,
  Pink: 0x04,
  Gray: 0x05,
  Silver: 0x06,
  Gold: 0x07,
  RoseGold: 0x08,
  SpaceGray: 0x09,
  DarkBlue: 0x0a,
  LightBlue: 0x0b,
  Yellow: 0x0c,
  Unknown: 0xff,
});

export { AirpodsBluetooth, DeviceColor, DeviceMode, DeviceModel, DeviceUtp };
