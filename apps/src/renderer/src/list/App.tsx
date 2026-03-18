import React, {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import useResize from '@/lib/hooks/use-resize';
import {
  SelectGlass,
  SelectGlassContent,
  SelectGlassItem,
  SelectGlassTrigger,
  SelectGlassValue,
} from '@/components/ui/select-glass';
import {
  ButtonGlass,
  CardGlass,
  InputGlass,
  ScrollAreaGlass,
  SeparatorGlass,
  SkeletonGlass,
} from '@/components/ui';

const App = () => {
  const containerRef = useResize('list') as RefObject<HTMLDivElement>;
  const [selectedAdapterIndex, setSelectedAdapterIndex] = useState<number>();
  const [prevSelectedAdapterIndex, setPrevSelectedAdapterIndex] =
    useState<number>();
  const [airpods, setAirpods] = useState<Record<string, Airpods>>({});
  const [scanInterval, setScanInterval] = useState<number>();
  const [fetching, setFetching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loopScan = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    window.backend.fingers().then((airpods) => {
      setAirpods(airpods);
      timeoutRef.current = setTimeout(loopScan, scanInterval);
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

    setFetching(true);
    timeoutRef.current = setTimeout(loopScan, scanInterval);
  }, [selectedAdapterIndex]);

  useEffect(() => {
    if (scanInterval === undefined) {
      window.backend.interval().then(setScanInterval);
    }

    window.backend.getAdapter().then(setSelectedAdapterIndex);
  }, []);

  return (
    <div
      className="relative p-2 h-200 w-100 overflow-hidden rounded-xl"
      ref={containerRef}
    >
      <SelectAdapter
        selectedAdapterIndex={selectedAdapterIndex}
        setSelectedAdapterIndex={setSelectedAdapterIndex}
      />
      <SeparatorGlass className="my-2" />
      {scanInterval ? (
        <ScanInterval
          scanInterval={scanInterval}
          setScanInterval={setScanInterval}
        />
      ) : (
        <SkeletonGlass />
      )}
      <SeparatorGlass className="my-2" />
      {fetching && (
        <h5 className="text-gray-200">
          Found {Object.entries(airpods).length} airpods...
        </h5>
      )}
      {Object.entries(airpods).length > 0 && <AirpodsList airpods={airpods} />}
    </div>
  );
};

const SelectAdapter = ({
  selectedAdapterIndex,
  setSelectedAdapterIndex,
}: {
  selectedAdapterIndex: number | undefined;
  setSelectedAdapterIndex: Dispatch<SetStateAction<number | undefined>>;
}) => {
  const [adapters, setAdapters] = useState<BluetoothAdapter[]>([]);

  useEffect(() => {
    window.backend.adapters().then(setAdapters);
  }, []);

  return (
    <SelectGlass
      onValueChange={(value) => setSelectedAdapterIndex(parseInt(value))}
      value={selectedAdapterIndex?.toString()}
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

const ScanInterval = ({
  scanInterval,
  setScanInterval,
}: {
  scanInterval: number;
  setScanInterval: Dispatch<SetStateAction<number | undefined>>;
}) => {
  const [value, setValue] = useState<number>(0);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setValue(value);
  };
  const handleClick = () => {
    const ms = value * 1000;
    setScanInterval(ms);
  };
  useEffect(() => setValue(Math.floor(scanInterval / 1000)), [scanInterval]);
  return (
    <div className="my-2">
      <h5 className="text-gray-200">Scan Interval(sec)</h5>
      <div className="flex gap-2 items-center justify-center">
        <InputGlass
          className="flex-1"
          onChange={handleChange}
          value={value}
          type="number"
          min="1"
          step="1"
          max="8"
        />
        <ButtonGlass variant="ghost" onClick={handleClick}>
          Submit
        </ButtonGlass>
      </div>
    </div>
  );
};

export default App;
