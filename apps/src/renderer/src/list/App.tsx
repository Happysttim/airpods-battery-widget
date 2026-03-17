import React, {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
} from 'react';
import useResize from '@/lib/hooks/use-resize';
import { LightRays } from '@/components/ui/light-rays';
import {
  SelectGlass,
  SelectGlassContent,
  SelectGlassItem,
  SelectGlassTrigger,
  SelectGlassValue,
} from '@/components/ui/select-glass';
import { CardGlass, ScrollAreaGlass } from '@/components/ui';

const App = () => {
  const containerRef = useResize('list') as RefObject<HTMLDivElement>;
  const [selectedAdapterIndex, setSelectedAdapterIndex] = useState<number>();
  const [prevSelectedAdapterIndex, setPrevSelectedAdapterIndex] =
    useState<number>();
  const [airpods, setAirpods] = useState<Record<string, Airpods>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loopScan = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    window.backend.fingers().then((airpods) => {
      setAirpods(airpods);
      timeoutRef.current = setTimeout(loopScan, 2000);
    });
  };

  useEffect(() => {
    if (selectedAdapterIndex === undefined) {
      return;
    }

    if (prevSelectedAdapterIndex === selectedAdapterIndex) {
      return;
    }

    setPrevSelectedAdapterIndex(selectedAdapterIndex);
    window.backend.setAdapter(selectedAdapterIndex);
    window.backend.startScan();

    timeoutRef.current = setTimeout(loopScan, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.backend.stopScan();
    };
  }, [selectedAdapterIndex]);

  return (
    <div
      className="relative p-2 h-200 w-100 overflow-hidden rounded-xl"
      ref={containerRef}
    >
      <LightRays />
      <SelectAdapter setSelectedAdapterIndex={setSelectedAdapterIndex} />
      {Object.entries(airpods).length > 0 && <AirpodsList airpods={airpods} />}
    </div>
  );
};

const SelectAdapter = ({
  setSelectedAdapterIndex,
}: {
  setSelectedAdapterIndex: Dispatch<React.SetStateAction<number | undefined>>;
}) => {
  const [adapters, setAdapters] = React.useState<BluetoothAdapter[]>([]);

  useEffect(() => {
    window.backend.adapters().then(setAdapters);
  }, []);

  return (
    <SelectGlass
      onValueChange={(value) => setSelectedAdapterIndex(parseInt(value))}
    >
      <SelectGlassTrigger className="w-90 [app-region:no-drag]">
        <SelectGlassValue placeholder="Bluetooth Adapter" />
      </SelectGlassTrigger>
      <SelectGlassContent className="[app-region:no-drag] z-9999">
        {adapters.map((adapter, idx) => (
          <SelectGlassItem key={adapter.address} value={idx.toString()}>
            {adapter.address}
          </SelectGlassItem>
        ))}
      </SelectGlassContent>
    </SelectGlass>
  );
};

const AirpodsList = ({ airpods }: { airpods: Record<string, Airpods> }) => {
  const handleClickAirpod = (airpod: Airpods) => {
    window.backend.updateWidget(airpod);
    window.backend.createWidget();
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full mt-4">
      <ScrollAreaGlass>
        {Object.entries(airpods).map(([, airpod]) => (
          <CardGlass.Root
            key={airpod.timestamp}
            onClick={() => handleClickAirpod(airpod)}
            className="[app-region:no-drag] cursor-pointer mb-2"
          >
            <CardGlass.Header>
              <CardGlass.Title>
                {window.backend.modelToString(airpod.model)}
              </CardGlass.Title>
              <CardGlass.Description>RSSI: {airpod.rssi}</CardGlass.Description>
            </CardGlass.Header>
            <CardGlass.Content>
              Color: {window.backend.colorToString(airpod.color)}
            </CardGlass.Content>
          </CardGlass.Root>
        ))}
      </ScrollAreaGlass>
    </div>
  );
};

export default App;
