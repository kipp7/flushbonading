import type { BusDefinition, InterfaceType, MCU, Pin, PinConstraint, Sensor } from "../types";

type CatalogParseResult<T> = {
  schemaVersion: number;
  items: T[];
  errors: string[];
};

export const CATALOG_SCHEMA_VERSION = 1;

const splitList = (value: string) =>
  value
    .split(/[\s,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;
  let atLineStart = true;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (!inQuotes && atLineStart) {
      let j = i;
      while (j < text.length && (text[j] === " " || text[j] === "\t")) j += 1;
      if (text[j] === "#") {
        while (j < text.length && text[j] !== "\n") j += 1;
        i = j;
        continue;
      }
    }

    if (inQuotes) {
      if (char === "\"") {
        const next = text[i + 1];
        if (next === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      atLineStart = false;
      continue;
    }

    if (char === ",") {
      row.push(current);
      current = "";
      atLineStart = false;
      continue;
    }

    if (char === "\n") {
      row.push(current);
      rows.push(row.map((cell) => cell.trim()));
      row = [];
      current = "";
      atLineStart = true;
      continue;
    }

    if (char === "\r") continue;
    current += char;
    atLineStart = false;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row.map((cell) => cell.trim()));
  }

  return rows.filter((rowItem) => rowItem.some((cell) => cell.length > 0));
};

const parseCsvSchemaVersion = (text: string) => {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) continue;
    const match = /schemaVersion\s*=\s*(\d+)/i.exec(trimmed);
    if (!match) continue;
    return Number(match[1]);
  }
  return 0;
};

const parseJsonSchemaVersion = (data: unknown) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return 0;
  const raw = (data as { schemaVersion?: unknown }).schemaVersion;
  return typeof raw === "number" ? raw : 0;
};

const assertCompatibleSchemaVersion = (schemaVersion: number, errors: string[]) => {
  if (schemaVersion === 0 || schemaVersion === CATALOG_SCHEMA_VERSION) return true;
  errors.push(`Unsupported schemaVersion ${schemaVersion}. Expected ${CATALOG_SCHEMA_VERSION}.`);
  return false;
};

const normalizeInterface = (value: string): InterfaceType | null => {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "I2C") return "I2C";
  if (trimmed === "SPI") return "SPI";
  if (trimmed === "UART") return "UART";
  if (trimmed === "ADC") return "ADC";
  if (trimmed === "PWM") return "PWM";
  if (trimmed === "GPIO") return "GPIO";
  if (trimmed === "ONE_WIRE" || trimmed === "1WIRE" || trimmed === "1-WIRE") return "ONE_WIRE";
  return null;
};

const parseI2cAddress = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = /^0x/i.test(trimmed) ? Number.parseInt(trimmed, 16) : Number.parseInt(trimmed, 10);
  if (Number.isNaN(value) || value < 0 || value > 0x7f) return undefined;
  return value;
};

const normalizeSeries = (value: string) => {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "F1" || trimmed === "F4" || trimmed === "G0" || trimmed === "H7") return trimmed as MCU["series"];
  return null;
};

const parsePinId = (pinId: string): Pin | null => {
  const trimmed = pinId.trim();
  const match = /^P([A-Z])(\d+)$/.exec(trimmed);
  if (match) {
    return {
      id: trimmed,
      label: trimmed,
      port: `P${match[1]}`,
      index: Number(match[2]),
      functions: [{ name: "GPIO", interface: "GPIO" }],
    };
  }
  if (!trimmed) return null;
  return {
    id: trimmed,
    label: trimmed,
    port: "SYS",
    index: 0,
    functions: [{ name: trimmed }],
    reserved: true,
    power: /^VD|^VSS/i.test(trimmed),
    notes: trimmed,
  };
};

const parseBusField = (raw: string, kind: "i2c" | "spi" | "uart") => {
  if (!raw.trim()) return [] as BusDefinition[];
  const entries = raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const buses: BusDefinition[] = [];

  entries.forEach((entry) => {
    const [idPart, signalsPart = ""] = entry.split(":");
    const id = idPart.trim();
    if (!id) return;
    const bus: BusDefinition = { id };
    signalsPart
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [keyRaw, pinsRaw] = pair.split("=");
        const key = keyRaw?.trim().toUpperCase();
        const pins = pinsRaw ? splitList(pinsRaw) : [];
        if (kind === "i2c") {
          if (key === "SCL") bus.scl = pins;
          if (key === "SDA") bus.sda = pins;
        }
        if (kind === "spi") {
          if (key === "SCK") bus.sck = pins;
          if (key === "MISO") bus.miso = pins;
          if (key === "MOSI") bus.mosi = pins;
        }
        if (kind === "uart") {
          if (key === "TX") bus.tx = pins;
          if (key === "RX") bus.rx = pins;
        }
      });
    buses.push(bus);
  });

  return buses;
};

export const buildSensorTemplateCsv = () => {
  const lines = [
    `# pinforge_schemaVersion=${CATALOG_SCHEMA_VERSION}; kind=sensors`,
    "id,name,interface,signals,description,i2cAddress,requiredBusId",
    "bme280,BME280,I2C,SCL|SDA,Temp/pressure sensor,0x76,",
    "ssd1306,SSD1306,I2C,SCL|SDA,OLED display,0x3C,",
  ];
  return lines.join("\n");
};

export const buildSensorTemplateJson = () =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "sensors",
      sensors: [
        {
          id: "bme280",
          name: "BME280",
          interface: "I2C",
          signals: ["SCL", "SDA"],
          i2cAddress: 0x76,
          description: "Temp/pressure sensor",
        },
      ],
    },
    null,
    2,
  );

export const buildMcuTemplateCsv = () => {
  const lines = [
    `# pinforge_schemaVersion=${CATALOG_SCHEMA_VERSION}; kind=mcus`,
    "id,name,series,package,pins,analogPins,pwmPins,reservedPins,i2c,spi,uart,notes",
    "stm32f103c8,STM32F103C8,F1,LQFP48,PA0|PA1|PA2|PA3|PA4|PA5|PA6|PA7|PB6|PB7|PA13|PA14|VDD|VSS|NRST|BOOT0,PA0|PA1|PA2|PA3,PA8|PA9,PA13|PA14,\"I2C1:SCL=PB6|PB8,SDA=PB7|PB9\",\"SPI1:SCK=PA5,MOSI=PA7,MISO=PA6\",\"USART1:TX=PA9,RX=PA10\",Demo import template",
  ];
  return lines.join("\n");
};

export const buildMcuTemplateJson = () =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "mcus",
      mcus: [
        {
          id: "stm32f103c8",
          name: "STM32F103C8",
          series: "F1",
          package: "LQFP48",
          pins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB6", "PB7", "PA13", "PA14"],
          buses: {
            i2c: [{ id: "I2C1", scl: ["PB6", "PB8"], sda: ["PB7", "PB9"] }],
            spi: [{ id: "SPI1", sck: ["PA5"], miso: ["PA6"], mosi: ["PA7"] }],
            uart: [{ id: "USART1", tx: ["PA9"], rx: ["PA10"] }],
          },
          analogPins: ["PA0", "PA1"],
          pwmPins: ["PA8", "PA9"],
          reservedPins: ["PA13", "PA14"],
          notes: "Demo import template",
        },
      ],
    },
    null,
    2,
  );

export const buildConstraintTemplateJson = () =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "constraints",
      constraints: [
        {
          id: "swd",
          label: "SWD Debug",
          pins: ["PA13", "PA14"],
          level: "hard",
          enabled: true,
          reason: "Keep debug pins free for SWD programming.",
          series: ["F1"],
        },
      ],
    },
    null,
    2,
  );

export const parseSensorCatalogCsv = (text: string): CatalogParseResult<Sensor> => {
  const schemaVersion = parseCsvSchemaVersion(text);
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { schemaVersion, items: [], errors: ["CSV is empty."] };
  const header = rows[0].map((cell) => cell.toLowerCase());
  const items: Sensor[] = [];
  const errors: string[] = [];
  if (!assertCompatibleSchemaVersion(schemaVersion, errors)) {
    return { schemaVersion, items: [], errors };
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const entry: Record<string, string> = {};
    header.forEach((key, index) => {
      entry[key] = row[index] ?? "";
    });

    const name = entry.name?.trim();
    const iface = entry.interface?.trim();
    const signalsRaw = entry.signals?.trim();
    if (!name || !iface || !signalsRaw) {
      errors.push(`Row ${i + 1}: missing required fields.`);
      continue;
    }
    const interfaceType = normalizeInterface(iface);
    if (!interfaceType) {
      errors.push(`Row ${i + 1}: invalid interface "${iface}".`);
      continue;
    }
    const signals = splitList(signalsRaw).map((signal) => signal.toUpperCase());
    if (signals.length === 0) {
      errors.push(`Row ${i + 1}: signals are empty.`);
      continue;
    }
    const i2cAddressRaw = entry.i2caddress ?? entry.i2cAddress ?? "";
    const i2cAddress = i2cAddressRaw ? parseI2cAddress(i2cAddressRaw) : undefined;
    if (i2cAddressRaw && i2cAddress === undefined) {
      errors.push(`Row ${i + 1}: invalid i2cAddress "${i2cAddressRaw}".`);
      continue;
    }
    const requiredBusId = (entry.requiredbusid ?? entry.requiredBusId ?? "").trim() || undefined;

    items.push({
      id: entry.id?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      name,
      interface: interfaceType,
      signals,
      description: entry.description?.trim() || "Imported sensor",
      i2cAddress: interfaceType === "I2C" ? i2cAddress : undefined,
      requiredBusId: ["I2C", "SPI", "UART"].includes(interfaceType) ? requiredBusId : undefined,
    });
  }

  return { schemaVersion, items, errors };
};

export const parseSensorCatalogJson = (text: string): CatalogParseResult<Sensor> => {
  const errors: string[] = [];
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    return { schemaVersion: 0, items: [], errors: ["Invalid JSON."] };
  }

  const schemaVersion = parseJsonSchemaVersion(data);
  if (!assertCompatibleSchemaVersion(schemaVersion, errors)) {
    return { schemaVersion, items: [], errors };
  }

  const list = Array.isArray(data) ? data : (data as { sensors?: unknown }).sensors;
  if (!Array.isArray(list)) return { schemaVersion, items: [], errors: ["JSON must contain sensors array."] };

  const items: Sensor[] = [];
  list.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`Item ${index + 1}: invalid sensor object.`);
      return;
    }
    const entry = raw as Partial<Sensor>;
    const name = entry.name?.trim();
    const iface = entry.interface;
    const signals = Array.isArray(entry.signals) ? entry.signals.map((s) => String(s).toUpperCase()) : [];
    if (!name || !iface || signals.length === 0) {
      errors.push(`Item ${index + 1}: missing required fields.`);
      return;
    }
    const interfaceType = normalizeInterface(iface);
    if (!interfaceType) {
      errors.push(`Item ${index + 1}: invalid interface "${iface}".`);
      return;
    }
    const i2cAddress =
      typeof entry.i2cAddress === "number"
        ? entry.i2cAddress
        : typeof entry.i2cAddress === "string"
          ? parseI2cAddress(entry.i2cAddress)
          : undefined;
    if (entry.i2cAddress !== undefined && interfaceType === "I2C" && i2cAddress === undefined) {
      errors.push(`Item ${index + 1}: invalid i2cAddress "${String(entry.i2cAddress)}".`);
      return;
    }
    const requiredBusId = typeof entry.requiredBusId === "string" ? entry.requiredBusId.trim() || undefined : undefined;
    items.push({
      id: entry.id?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      name,
      interface: interfaceType,
      signals,
      description: entry.description?.trim() || "Imported sensor",
      i2cAddress: interfaceType === "I2C" ? i2cAddress : undefined,
      requiredBusId: ["I2C", "SPI", "UART"].includes(interfaceType) ? requiredBusId : undefined,
    });
  });

  return { schemaVersion, items, errors };
};

export const parseMcuCatalogCsv = (text: string): CatalogParseResult<MCU> => {
  const schemaVersion = parseCsvSchemaVersion(text);
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { schemaVersion, items: [], errors: ["CSV is empty."] };
  const header = rows[0].map((cell) => cell.toLowerCase());
  const items: MCU[] = [];
  const errors: string[] = [];
  if (!assertCompatibleSchemaVersion(schemaVersion, errors)) {
    return { schemaVersion, items: [], errors };
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const entry: Record<string, string> = {};
    header.forEach((key, index) => {
      entry[key] = row[index] ?? "";
    });

    const id = entry.id?.trim();
    const name = entry.name?.trim();
    const series = normalizeSeries(entry.series ?? "");
    const pkg = entry.package?.trim();
    const pins = splitList(entry.pins ?? "").map((pin) => pin.toUpperCase());
    if (!id || !name || !series || !pkg || pins.length === 0) {
      errors.push(`Row ${i + 1}: missing required fields.`);
      continue;
    }

    const pinObjects = pins
      .map((pinId) => parsePinId(pinId))
      .filter((pin): pin is Pin => Boolean(pin));
    if (pinObjects.length === 0) {
      errors.push(`Row ${i + 1}: invalid pins list.`);
      continue;
    }

    const analogPins = splitList(entry.analogpins ?? entry.analogPins ?? "").map((pin) => pin.toUpperCase());
    const pwmPins = splitList(entry.pwmpins ?? entry.pwmPins ?? "").map((pin) => pin.toUpperCase());
    const reservedPins = splitList(entry.reservedpins ?? entry.reservedPins ?? "").map((pin) => pin.toUpperCase());

    const i2c = parseBusField(entry.i2c ?? "", "i2c");
    const spi = parseBusField(entry.spi ?? "", "spi");
    const uart = parseBusField(entry.uart ?? "", "uart");

    items.push({
      id,
      name,
      series,
      package: pkg,
      pins: pinObjects,
      buses: { i2c, spi, uart },
      analogPins,
      pwmPins,
      reservedPins,
      notes: entry.notes?.trim() || "Imported MCU",
    });
  }

  return { schemaVersion, items, errors };
};

export const parseMcuCatalogJson = (text: string): CatalogParseResult<MCU> => {
  const errors: string[] = [];
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    return { schemaVersion: 0, items: [], errors: ["Invalid JSON."] };
  }

  const schemaVersion = parseJsonSchemaVersion(data);
  if (!assertCompatibleSchemaVersion(schemaVersion, errors)) {
    return { schemaVersion, items: [], errors };
  }

  const list = Array.isArray(data) ? data : (data as { mcus?: unknown }).mcus;
  if (!Array.isArray(list)) return { schemaVersion, items: [], errors: ["JSON must contain mcus array."] };

  const items: MCU[] = [];
  list.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`Item ${index + 1}: invalid MCU object.`);
      return;
    }
    const entry = raw as Partial<MCU> & { pins?: unknown };
    if (!entry.id || !entry.name || !entry.series || !entry.package || !Array.isArray(entry.pins)) {
      errors.push(`Item ${index + 1}: missing required fields.`);
      return;
    }
    const series = normalizeSeries(entry.series);
    if (!series) {
      errors.push(`Item ${index + 1}: invalid series "${entry.series}".`);
      return;
    }
    const pinObjects = (entry.pins as unknown[]).map((pinRaw) => {
      if (pinRaw && typeof pinRaw === "object" && "id" in (pinRaw as object)) {
        return pinRaw as Pin;
      }
      return parsePinId(String(pinRaw).toUpperCase());
    });
    const pins = pinObjects.filter((pin): pin is Pin => Boolean(pin));
    if (pins.length === 0) {
      errors.push(`Item ${index + 1}: invalid pins list.`);
      return;
    }
    const buses = entry.buses ?? { i2c: [], spi: [], uart: [] };
    items.push({
      id: entry.id,
      name: entry.name,
      series,
      package: entry.package,
      pins,
      buses,
      analogPins: Array.isArray(entry.analogPins) ? entry.analogPins : [],
      pwmPins: Array.isArray(entry.pwmPins) ? entry.pwmPins : [],
      reservedPins: Array.isArray(entry.reservedPins) ? entry.reservedPins : [],
      notes: entry.notes,
    });
  });

  return { schemaVersion, items, errors };
};

export const parseConstraintCatalogJson = (text: string): CatalogParseResult<PinConstraint> => {
  const errors: string[] = [];
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    return { schemaVersion: 0, items: [], errors: ["Invalid JSON."] };
  }

  const schemaVersion = parseJsonSchemaVersion(data);
  if (!assertCompatibleSchemaVersion(schemaVersion, errors)) {
    return { schemaVersion, items: [], errors };
  }

  const list = Array.isArray(data) ? data : (data as { constraints?: unknown }).constraints;
  if (!Array.isArray(list)) return { schemaVersion, items: [], errors: ["JSON must contain constraints array."] };

  const items: PinConstraint[] = [];
  list.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`Item ${index + 1}: invalid constraint object.`);
      return;
    }
    const entry = raw as PinConstraint;
    if (!entry.id || !entry.label || !Array.isArray(entry.pins) || entry.pins.length === 0) {
      errors.push(`Item ${index + 1}: missing required fields.`);
      return;
    }
    const level = entry.level === "soft" ? "soft" : "hard";
    const enabled = typeof entry.enabled === "boolean" ? entry.enabled : true;
    items.push({
      id: entry.id,
      label: entry.label,
      pins: entry.pins.map((pin) => String(pin).toUpperCase()),
      level,
      enabled,
      source: "import",
      reason: entry.reason ?? "Constraint",
      series: entry.series,
      mcuIds: entry.mcuIds,
    });
  });

  return { schemaVersion, items, errors };
};

const csvEscape = (value: string) => {
  if (value.includes("\"")) value = value.replaceAll("\"", "\"\"");
  if (/[",\n]/.test(value)) return `"${value}"`;
  return value;
};

const formatBusDefinitions = (buses: BusDefinition[], kind: "i2c" | "spi" | "uart") => {
  if (!buses || buses.length === 0) return "";
  const joinPins = (pins?: string[]) => (pins && pins.length > 0 ? pins.join("|") : "");
  return buses
    .map((bus) => {
      if (kind === "i2c") {
        return `${bus.id}:SCL=${joinPins(bus.scl)},SDA=${joinPins(bus.sda)}`;
      }
      if (kind === "spi") {
        return `${bus.id}:SCK=${joinPins(bus.sck)},MOSI=${joinPins(bus.mosi)},MISO=${joinPins(bus.miso)}`;
      }
      return `${bus.id}:TX=${joinPins(bus.tx)},RX=${joinPins(bus.rx)}`;
    })
    .join(";");
};

export const buildSensorCatalogJson = (items: Sensor[]) =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "sensors",
      generatedAt: new Date().toISOString(),
      sensors: items,
    },
    null,
    2,
  );

export const buildSensorCatalogCsv = (items: Sensor[]) => {
  const header = "id,name,interface,signals,description,i2cAddress,requiredBusId";
  const lines = items.map((sensor) => {
    const signals = sensor.signals.join("|");
    const i2cAddress =
      sensor.i2cAddress !== undefined
        ? `0x${sensor.i2cAddress.toString(16).padStart(2, "0")}`
        : "";
    return [
      csvEscape(sensor.id),
      csvEscape(sensor.name),
      csvEscape(sensor.interface),
      csvEscape(signals),
      csvEscape(sensor.description ?? ""),
      csvEscape(i2cAddress),
      csvEscape(sensor.requiredBusId ?? ""),
    ].join(",");
  });
  return [`# pinforge_schemaVersion=${CATALOG_SCHEMA_VERSION}; kind=sensors`, header, ...lines].join("\n");
};

export const buildMcuCatalogJson = (items: MCU[]) =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "mcus",
      generatedAt: new Date().toISOString(),
      mcus: items,
    },
    null,
    2,
  );

export const buildMcuCatalogCsv = (items: MCU[]) => {
  const header = "id,name,series,package,pins,analogPins,pwmPins,reservedPins,i2c,spi,uart,notes";
  const lines = items.map((mcu) => {
    const pins = mcu.pins.map((pin) => pin.id).join("|");
    const analogPins = mcu.analogPins.join("|");
    const pwmPins = mcu.pwmPins.join("|");
    const reservedPins = mcu.reservedPins.join("|");
    const i2c = formatBusDefinitions(mcu.buses.i2c, "i2c");
    const spi = formatBusDefinitions(mcu.buses.spi, "spi");
    const uart = formatBusDefinitions(mcu.buses.uart, "uart");
    return [
      csvEscape(mcu.id),
      csvEscape(mcu.name),
      csvEscape(mcu.series),
      csvEscape(mcu.package),
      csvEscape(pins),
      csvEscape(analogPins),
      csvEscape(pwmPins),
      csvEscape(reservedPins),
      csvEscape(i2c),
      csvEscape(spi),
      csvEscape(uart),
      csvEscape(mcu.notes ?? ""),
    ].join(",");
  });
  return [`# pinforge_schemaVersion=${CATALOG_SCHEMA_VERSION}; kind=mcus`, header, ...lines].join("\n");
};

export const buildConstraintCatalogJson = (items: PinConstraint[]) =>
  JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      kind: "constraints",
      generatedAt: new Date().toISOString(),
      constraints: items,
    },
    null,
    2,
  );

export const buildConstraintCatalogCsv = (items: PinConstraint[]) => {
  const header = "id,label,level,enabled,source,pins,reason,series,mcuIds";
  const lines = items.map((constraint) => {
    const pins = constraint.pins.join("|");
    const series = Array.isArray(constraint.series) ? constraint.series.join("|") : "";
    const mcuIds = Array.isArray(constraint.mcuIds) ? constraint.mcuIds.join("|") : "";
    return [
      csvEscape(constraint.id),
      csvEscape(constraint.label),
      csvEscape(constraint.level),
      csvEscape(constraint.enabled === false ? "false" : "true"),
      csvEscape(constraint.source ?? ""),
      csvEscape(pins),
      csvEscape(constraint.reason ?? ""),
      csvEscape(series),
      csvEscape(mcuIds),
    ].join(",");
  });
  return [`# pinforge_schemaVersion=${CATALOG_SCHEMA_VERSION}; kind=constraints`, header, ...lines].join("\n");
};
