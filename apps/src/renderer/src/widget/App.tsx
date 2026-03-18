import { Fragment, useEffect, useRef, useState } from 'react';
import AirpodsLeft from '@assets/left.png';
import AirpodsRight from '@assets/right.png';
import AirpodsCase from '@assets/case.png';
import type { IpcRendererEvent } from 'electron/renderer';
import { CircularProgressGlass } from '@/components/ui';

const App = () => {
  const [health, setHealth] = useState<Airpods>();
  const [interval, setIntervalValue] = useState<number | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loopHealth = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    window.backend.getHealth().then((health) => {
      setHealth(health);
      timeoutRef.current = setTimeout(loopHealth, interval);
    });
  };

  useEffect(() => {
    if (interval === undefined) {
      window.backend.interval().then(setIntervalValue);
    } else {
      window.backend.getHealth().then((health) => {
        setHealth(health);
        setTimeout(loopHealth, interval);
      });
    }
  }, [interval]);

  useEffect(() => {
    const updateListener = (_: IpcRendererEvent, airpods: Airpods) =>
      setHealth(airpods);
    window.backend.onUpdate(updateListener);
    return () => {
      window.backend.removeListener(updateListener);
    };
  }, []);

  return (
    <div className="w-screen h-screen relative p-5 [app-region:drag]">
      {health ? <Health airpods={health} /> : <NoHealth />}
    </div>
  );
};

const NoHealth = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <h3 className="text-white">Not Found Airpods</h3>
    </div>
  );
};

const Health = ({ airpods }: { airpods: Airpods }) => {
  const color = (percent: number, charging: boolean) => {
    if (charging) return 'blue';
    if (percent > 70) return 'emerald';
    if (percent > 30) return 'amber';
    return 'rose';
  };
  return (
    <Fragment>
      <h3 className="text-gray-300">
        {window.backend.modelToString(airpods.model)}
      </h3>
      <h4 className="text-gray-300">
        Color: {window.backend.colorToString(airpods.color)} / RSSI:{' '}
        {airpods.rssi}
      </h4>
      <h4 className="text-gray-300">
        UTP: {window.backend.utpToString(airpods.utp)}
      </h4>
      <div className="flex gap-4 w-full items-center justify-center my-5">
        <div className="flex flex-col w-20 items-center justify-center mx-5">
          <img src={AirpodsLeft} className="object-cover my-2" />
          <CircularProgressGlass
            label={`${Math.max(airpods.battery.leftPercent, 0).toString()}%`}
            variant="determinate"
            color={color(
              airpods.battery.leftPercent,
              airpods.battery.leftCharging,
            )}
            value={Math.max(airpods.battery.leftPercent, 0)}
          />
        </div>
        <div className="flex flex-col w-20 items-center justify-center mx-5">
          <img src={AirpodsCase} className="object-cover my-2" />
          <CircularProgressGlass
            label={`${Math.max(airpods.battery.casePercent, 0).toString()}%`}
            variant="determinate"
            color={color(
              airpods.battery.casePercent,
              airpods.battery.caseCharging,
            )}
            value={Math.max(airpods.battery.casePercent, 0)}
          />
        </div>
        <div className="flex flex-col w-20 items-center justify-center mx-5">
          <img src={AirpodsRight} className="object-cover my-2" />
          <CircularProgressGlass
            label={`${Math.max(airpods.battery.rightPercent, 0).toString()}%`}
            variant="determinate"
            color={color(
              airpods.battery.rightPercent,
              airpods.battery.rightCharging,
            )}
            value={Math.max(airpods.battery.rightPercent, 0)}
          />
        </div>
      </div>
    </Fragment>
  );
};

export default App;
