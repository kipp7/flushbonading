export type InterfaceType = "I2C" | "SPI" | "UART" | "ADC" | "PWM" | "GPIO" | "ONE_WIRE";

export type PinFunction = {
  name: string;
  bus?: string;
  interface?: InterfaceType;
  signal?: string;
};

export type Pin = {
  id: string;
  label: string;
  port: string;
  index: number;
  functions: PinFunction[];
  reserved?: boolean;
  power?: boolean;
  notes?: string;
};

export type BusDefinition = {
  id: string;
  scl?: string[];
  sda?: string[];
  sck?: string[];
  miso?: string[];
  mosi?: string[];
  tx?: string[];
  rx?: string[];
};

export type MCU = {
  id: string;
  name: string;
  series: "F1" | "F4" | "G0" | "H7";
  package: string;
  pins: Pin[];
  buses: {
    i2c: BusDefinition[];
    spi: BusDefinition[];
    uart: BusDefinition[];
  };
  analogPins: string[];
  pwmPins: string[];
  reservedPins: string[];
  notes?: string;
};

export type Sensor = {
  id: string;
  name: string;
  interface: InterfaceType;
  signals: string[];
  description: string;
  i2cAddress?: number;
  requiredBusId?: string;
};

export type PinUsageStatus = "available" | "reserved" | "power" | "bus" | "sensor";

export type PinUsage = {
  status: PinUsageStatus;
  label?: string;
};

export type PinConstraint = {
  id: string;
  label: string;
  pins: string[];
  level: "hard" | "soft";
  enabled?: boolean;
  source?: "default" | "import" | "custom" | "project";
  reason: string;
  series?: MCU["series"][];
  mcuIds?: string[];
};

export type Warning = {
  sensorId: string;
  sensorName: string;
  message: string;
  detail?: string;
};

export type SensorAllocation = {
  sensorId: string;
  sensorName: string;
  interface: InterfaceType;
  busId?: string;
  assignedPins: Record<string, string>;
};

export type Conflict = {
  sensorId: string;
  sensorName: string;
  message: string;
  detail?: string;
};

export type AllocationResult = {
  allocations: SensorAllocation[];
  conflicts: Conflict[];
  warnings: Warning[];
  buses: {
    i2c: Array<{ id: string; scl: string; sda: string; sensors: string[] }>;
    spi: Array<{ id: string; sck: string; mosi: string; miso: string; csPins: string[]; sensors: string[] }>;
    uart: Array<{ id: string; tx: string; rx: string; sensor: string }>;
  };
  pinUsage: Record<string, PinUsage>;
};

export type PinLockMap = Record<string, Record<string, string>>;

export type ProjectFile = {
  version: 1;
  locale: "zh" | "en";
  series: MCU["series"];
  mcuId: string;
  selectedSensors: string[];
  customSensors: Sensor[];
  customMcus?: MCU[];
  boardPositions: Record<string, { x: number; y: number }>;
  boardOrientations?: Record<string, "top" | "right" | "bottom" | "left" | "auto">;
  mcuPosition: { x: number; y: number } | null;
  pinLocks: PinLockMap;
  pinConstraints?: PinConstraint[];
};

