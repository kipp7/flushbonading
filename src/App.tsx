import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import "./App.css";
import { defaultConstraints } from "./data/constraints";
import { mcuCatalog, mcuSeries } from "./data/mcus";
import { sensors } from "./data/sensors";
import { copy, type Locale } from "./i18n";
import { allocatePins } from "./lib/allocator";
import { buildDiagnosticsText } from "./lib/diagnostics";
import {
  buildConstraintCatalogCsv,
  buildConstraintCatalogJson,
  buildConstraintTemplateJson,
  buildMcuCatalogCsv,
  buildMcuCatalogJson,
  buildMcuTemplateCsv,
  buildMcuTemplateJson,
  buildSensorCatalogCsv,
  buildSensorCatalogJson,
  buildSensorTemplateCsv,
  buildSensorTemplateJson,
  parseConstraintCatalogJson,
  parseMcuCatalogCsv,
  parseMcuCatalogJson,
  parseSensorCatalogCsv,
  parseSensorCatalogJson,
} from "./lib/catalog";
import { loadConstraints, loadCustomMcus, loadCustomSensors, saveConstraints, saveCustomMcus, saveCustomSensors } from "./lib/catalogStorage";
import {
  buildHardwareBomCsv,
  buildHardwareJson,
  buildHardwarePinUsageCsv,
  buildHardwareWiringCsv,
  buildPinmapCsv,
  buildPinmapJson,
  downloadBlob,
  downloadText,
} from "./lib/export";
import { loadSettings, resetSettings as resetAppSettings, saveSettings } from "./lib/settings";
import { buildSplCode, type SplSpeedPresetId } from "./lib/codegen";
import { buildZipBlob } from "./lib/zip";
import type { AllocationResult, InterfaceType, MCU, PinConstraint, PinLockMap, ProjectFile, Sensor } from "./types";
import { Modal } from "./ui/Modal";
import { ToastHost, type ToastItem, type ToastTone } from "./ui/ToastHost";

type PinSide = "top" | "right" | "bottom" | "left";
type McuPin = MCU["pins"][number];
type BoardSide = "top" | "right" | "bottom" | "left";

type PinDisplay = {
  pin: McuPin;
  status: string;
};

type WireTone = "pwr" | "gnd" | "comm" | "sig";
type PinTone = "pwr" | "gnd" | "comm" | "sig" | "idle" | "reserved";

type WireConnection = {
  id: string;
  fromId: string;
  toId: string;
  tone: WireTone;
};

type WirePath = WireConnection & {
  d: string;
};

type ImportFeedback = {
  ok: boolean;
  message: string;
};

type CatalogImportKind = "sensors" | "mcus" | "constraints";
type CatalogImportFormat = "csv" | "json";
type CatalogImportMode = "merge" | "replace";

type CatalogImportPreview = {
  kind: CatalogImportKind;
  format: CatalogImportFormat;
  filename: string;
  schemaVersion: number;
  items: Sensor[] | MCU[] | PinConstraint[];
  errors: string[];
  mode: CatalogImportMode;
};

const sideOrder: PinSide[] = ["top", "right", "bottom", "left"];
const visiblePinStatuses = new Set(["available", "reserved", "power", "bus", "sensor"]);

const portOrder = ["SYS", "PA", "PB", "PC", "PD", "PE", "PF", "PG", "PH", "PI", "PJ", "PK"];
const portRank = new Map<string, number>(portOrder.map((port, index) => [port, index]));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const mergeById = <T extends { id: string }>(base: T[], overlay: T[]) => {
  const map = new Map<string, T>();
  base.forEach((item) => map.set(item.id, item));
  overlay.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const distributePositions = (targets: number[], size: number, gap: number, min: number, max: number) => {
  if (targets.length === 0) return [];
  const positions = targets.map((target) => clamp(target - size / 2, min, max - size)).sort((a, b) => a - b);
  for (let i = 1; i < positions.length; i += 1) {
    const minTop = positions[i - 1] + size + gap;
    if (positions[i] < minTop) positions[i] = minTop;
  }
  const overflow = positions[positions.length - 1] - (max - size);
  if (overflow > 0) {
    for (let i = 0; i < positions.length; i += 1) {
      positions[i] = Math.max(min, positions[i] - overflow);
    }
    for (let i = positions.length - 2; i >= 0; i -= 1) {
      const maxTop = positions[i + 1] - size - gap;
      if (positions[i] > maxTop) positions[i] = maxTop;
    }
  }
  return positions;
};

const getPinPoint = (
  info: { side: BoardSide; index: number; count: number },
  boardWidth: number,
  boardHeight: number,
) => {
  const count = Math.max(info.count, 1);
  if (info.side === "top" || info.side === "bottom") {
    const rowWidth = count * pinItemWidth + Math.max(0, count - 1) * pinRowGap;
    const rowContainerWidth = Math.max(0, boardWidth - pinRowInset * 2);
    const rowStart = pinRowInset + Math.max(0, (rowContainerWidth - rowWidth) / 2);
    const x = rowStart + info.index * (pinItemWidth + pinRowGap) + pinItemWidth / 2;
    const y =
      info.side === "top"
        ? pinRowEdgeOffset + pinItemHeight / 2
        : Math.max(pinRowEdgeOffset, boardHeight - pinRowEdgeOffset - pinItemHeight / 2);
    return { x: clamp(x, 0, boardWidth), y: clamp(y, 0, boardHeight) };
  }

  const colHeight = Math.max(0, boardHeight - pinColumnInset);
  const step = count > 1 ? Math.max(0, (colHeight - pinItemHeight) / (count - 1)) : 0;
  const startY = pinColumnEdgeInset;
  const y =
    startY + (count === 1 ? Math.max(0, (colHeight - pinItemHeight) / 2) : info.index * step) + pinItemHeight / 2;
  const x =
    info.side === "left"
      ? pinColumnSideOffset + pinItemWidth / 2
      : Math.max(pinColumnSideOffset, boardWidth - pinColumnSideOffset - pinItemWidth / 2);
  return { x: clamp(x, 0, boardWidth), y: clamp(y, 0, boardHeight) };
};

const boardSidePriority: BoardSide[] = ["right", "left", "top", "bottom"];

const interfaceOptions: InterfaceType[] = ["I2C", "SPI", "UART", "ADC", "PWM", "GPIO", "ONE_WIRE"];

const interfaceLabels: Record<InterfaceType, string> = {
  I2C: "I2C",
  SPI: "SPI",
  UART: "UART",
  ADC: "ADC",
  PWM: "PWM",
  GPIO: "GPIO",
  ONE_WIRE: "1-Wire",
};

const defaultSignalsByInterface: Record<InterfaceType, string[]> = {
  I2C: ["SCL", "SDA"],
  SPI: ["SCK", "MISO", "MOSI", "CS"],
  UART: ["TX", "RX"],
  ADC: ["AIN"],
  PWM: ["PWM"],
  GPIO: ["GPIO"],
  ONE_WIRE: ["DQ"],
};

const groupByInterface = (items: Sensor[]) => {
  return items.reduce<Record<string, Sensor[]>>((acc, sensor) => {
    acc[sensor.interface] = acc[sensor.interface] ?? [];
    acc[sensor.interface].push(sensor);
    return acc;
  }, {});
};

const formatFunctions = (sensor: Sensor) => sensor.signals.join("/");

const getDefaultMcu = (series: (typeof mcuSeries)[number]) =>
  mcuCatalog.find((item) => item.series === series) ?? mcuCatalog[0];

const buildExportName = (mcu: MCU, suffix: string) => `${mcu.name.toLowerCase()}_${suffix}`;

const sortPins = (a: McuPin, b: McuPin) => {
  const rankA = portRank.get(a.port) ?? 999;
  const rankB = portRank.get(b.port) ?? 999;
  if (rankA !== rankB) return rankA - rankB;
  return a.index - b.index;
};

const getPinsPerSide = (pkg: string) => {
  const match = pkg.match(/(\d+)/);
  if (!match) return 12;
  const total = Number(match[1]);
  if (!Number.isFinite(total) || total <= 0) return 12;
  return total % 4 === 0 ? total / 4 : 12;
};

const arrangePins = (pins: McuPin[], allocation: AllocationResult, perSide: number) => {
  const sorted = pins.slice().sort(sortPins);
  const totalSlots = perSide * 4;
  const clipped = sorted.slice(0, totalSlots);
  const arranged: Record<PinSide, PinDisplay[]> = { top: [], right: [], bottom: [], left: [] };

  clipped.forEach((pin, index) => {
    const side = sideOrder[Math.floor(index / perSide) % sideOrder.length];
    arranged[side].push({ pin, status: allocation.pinUsage[pin.id]?.status ?? "available" });
  });

  return {
    top: arranged.top,
    right: arranged.right,
    bottom: arranged.bottom.slice().reverse(),
    left: arranged.left.slice().reverse(),
  };
};

const resolvePinTone = (status: string, pin?: McuPin): PinTone => {
  if (status === "power") {
    const label = `${pin?.label ?? ""} ${pin?.notes ?? ""}`.toLowerCase();
    if (label.includes("gnd") || label.includes("vss")) return "gnd";
    return "pwr";
  }
  if (status === "reserved") return "reserved";
  if (status === "available") return "idle";
  if (status === "bus") return "comm";
  if (status === "sensor") return "sig";
  return "idle";
};

const resolveWireTone = (signal: string, iface: string): WireTone => {
  const key = signal.toLowerCase();
  if (key.includes("gnd")) return "gnd";
  if (key.includes("vcc") || key.includes("3v") || key.includes("5v") || key.includes("vbat")) return "pwr";
  if (["i2c", "spi", "uart"].includes(iface.toLowerCase())) return "comm";
  if (["scl", "sda", "sck", "mosi", "miso", "tx", "rx"].includes(key)) return "comm";
  return "sig";
};

const stageMinHeight = 520;
const stageMinWidth = 1080;
const stagePadding = 40;
const sensorBoardWidth = 210;
const sensorBoardHeight = 150;
const sensorBoardGap = 24;
const sensorBoardGapX = 28;
const boardHeaderHeight = 34;
const pinItemHeight = 16;
const pinItemWidth = 26;
const pinRowGap = 8;
const pinRowInset = 64;
const pinColumnGap = 10;
const pinColumnInset = 168;
const pinRowEdgeOffset = 16;
const pinColumnSideOffset = 12;
const pinColumnEdgeInset = pinColumnInset / 2;
const boardHeightPadding = 24;
const mcuBoardMinWidth = 440;
const zoomMin = 0.5;
const zoomMax = 2.0;
const zoomStep = 0.1;

export const App = () => {
  const [locale, setLocale] = useState<Locale>(() => loadSettings().locale);
  const [series, setSeries] = useState<(typeof mcuSeries)[number]>("F1");
  const [mcuId, setMcuId] = useState(getDefaultMcu("F1").id);
  const [sensorQuery, setSensorQuery] = useState("");
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [customSensors, setCustomSensors] = useState<Sensor[]>(() => loadCustomSensors());
  const [customMcus, setCustomMcus] = useState<MCU[]>(() => loadCustomMcus());
  const [pinConstraints, setPinConstraints] = useState<PinConstraint[]>(() => {
    const stored = loadConstraints();
    return stored.length > 0 ? stored : defaultConstraints;
  });
  const [pinLocks, setPinLocks] = useState<PinLockMap>({});
  const [customForm, setCustomForm] = useState({
    name: "",
    interface: "I2C" as InterfaceType,
    signals: defaultSignalsByInterface.I2C.join(", "),
    description: "",
  });
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const [constraintForm, setConstraintForm] = useState({
    id: "",
    label: "",
    pins: "",
    reason: "",
    level: "hard" as PinConstraint["level"],
    enabled: true,
  });
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    sensors?: ImportFeedback;
    mcus?: ImportFeedback;
    constraints?: ImportFeedback;
  }>({});
  const [importPreview, setImportPreview] = useState<CatalogImportPreview | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [exportBundleOpen, setExportBundleOpen] = useState(false);
  const [exportBundleOptions, setExportBundleOptions] = useState({
    pinmapJson: true,
    pinmapCsv: true,
    hardwareJson: true,
    hardwareCsv: true,
    spl: true,
  });
  const [forceCrash, setForceCrash] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [zoom, setZoom] = useState(1);
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const spacePressedRef = useRef(false);
  const [splSpeedPreset, setSplSpeedPreset] = useState<SplSpeedPresetId>("standard");
  const [hoverFocus, setHoverFocus] = useState<
    | { kind: "mcuPin"; pinId: string }
    | { kind: "sensor"; sensorId: string }
    | { kind: "sensorSignal"; sensorId: string; signal: string }
    | null
  >(null);
  const [boardOrientations, setBoardOrientations] = useState<Record<string, BoardSide | "auto">>({});

  const t = copy[locale];
  const appName = typeof __PINFORGE_NAME__ !== "undefined" ? __PINFORGE_NAME__ : "pinforge";
  const appVersion = typeof __PINFORGE_VERSION__ !== "undefined" ? __PINFORGE_VERSION__ : "0.0.0";
  const buildTime = typeof __PINFORGE_BUILD_TIME__ !== "undefined" ? __PINFORGE_BUILD_TIME__ : "";
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [wirePaths, setWirePaths] = useState<WirePath[]>([]);
  const [canvasSize, setCanvasSize] = useState({
    width: 0,
    height: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [boardPositions, setBoardPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [mcuPosition, setMcuPosition] = useState<{ x: number; y: number } | null>(null);
  const [mcuLocked, setMcuLocked] = useState(false);
  const movedBoardsRef = useRef(new Set<string>());
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const sensorCsvInputRef = useRef<HTMLInputElement | null>(null);
  const sensorJsonInputRef = useRef<HTMLInputElement | null>(null);
  const mcuCsvInputRef = useRef<HTMLInputElement | null>(null);
  const mcuJsonInputRef = useRef<HTMLInputElement | null>(null);
  const constraintJsonInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimersRef = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => prev.concat({ id, tone, title, detail }).slice(-4));
      const timer = window.setTimeout(() => dismissToast(id), 4000);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    saveSettings({ version: 1, locale });
  }, [locale]);

  useEffect(() => {
    saveCustomSensors(customSensors);
  }, [customSensors]);

  useEffect(() => {
    saveCustomMcus(customMcus);
  }, [customMcus]);

  useEffect(() => {
    saveConstraints(pinConstraints);
  }, [pinConstraints]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (isTypingTarget(event.target)) return;
      spacePressedRef.current = true;
      event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (isTypingTarget(event.target)) return;
      spacePressedRef.current = false;
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const fullMcuCatalog = useMemo(() => mergeById(mcuCatalog, customMcus), [customMcus]);
  const mcuOptions = useMemo(
    () => fullMcuCatalog.filter((mcu) => mcu.series === series),
    [fullMcuCatalog, series],
  );
  const currentMcu = useMemo(
    () => mcuOptions.find((mcu) => mcu.id === mcuId) ?? fullMcuCatalog[0],
    [fullMcuCatalog, mcuId, mcuOptions],
  );
  const sensorCatalog = useMemo(() => mergeById(sensors, customSensors), [customSensors]);
  const gpioOptions = useMemo(
    () => currentMcu.pins.filter((pin) => pin.port !== "SYS" && !pin.reserved && !pin.power).map((pin) => pin.id),
    [currentMcu],
  );
  const i2cSclOptions = useMemo(() => {
    const pins = currentMcu.buses.i2c.flatMap((bus) => bus.scl ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const i2cSdaOptions = useMemo(() => {
    const pins = currentMcu.buses.i2c.flatMap((bus) => bus.sda ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const spiSckOptions = useMemo(() => {
    const pins = currentMcu.buses.spi.flatMap((bus) => bus.sck ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const spiMisoOptions = useMemo(() => {
    const pins = currentMcu.buses.spi.flatMap((bus) => bus.miso ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const spiMosiOptions = useMemo(() => {
    const pins = currentMcu.buses.spi.flatMap((bus) => bus.mosi ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const uartTxOptions = useMemo(() => {
    const pins = currentMcu.buses.uart.flatMap((bus) => bus.tx ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const uartRxOptions = useMemo(() => {
    const pins = currentMcu.buses.uart.flatMap((bus) => bus.rx ?? []);
    return Array.from(new Set(pins));
  }, [currentMcu]);
  const perSide = useMemo(() => getPinsPerSide(currentMcu.package), [currentMcu.package]);

  const filteredSensors = useMemo(() => {
    const query = sensorQuery.trim().toLowerCase();
    if (!query) return sensorCatalog;
    return sensorCatalog.filter((sensor) => sensor.name.toLowerCase().includes(query));
  }, [sensorQuery, sensorCatalog]);

  const groupedSensors = useMemo(() => groupByInterface(filteredSensors), [filteredSensors]);

  const selectedSensorList = useMemo(
    () => sensorCatalog.filter((sensor) => selectedSensors.includes(sensor.id)),
    [selectedSensors, sensorCatalog],
  );

  const allocation = useMemo(
    () => allocatePins(currentMcu, selectedSensorList, pinLocks, pinConstraints),
    [currentMcu, selectedSensorList, pinConstraints, pinLocks],
  );

  const allocationMap = useMemo(() => {
    const map = new Map<string, AllocationResult["allocations"][number]>();
    allocation.allocations.forEach((item) => map.set(item.sensorId, item));
    return map;
  }, [allocation]);

  const fullPinArrangement = useMemo(
    () => arrangePins(currentMcu.pins, allocation, perSide),
    [currentMcu, allocation, perSide],
  );

  const pinArrangement = useMemo(() => {
    const arranged = fullPinArrangement;
    const filterPins = (pins: PinDisplay[]) => pins.filter((item) => visiblePinStatuses.has(item.status));
    return {
      top: filterPins(arranged.top),
      right: filterPins(arranged.right),
      bottom: filterPins(arranged.bottom),
      left: filterPins(arranged.left),
    };
  }, [fullPinArrangement]);

  const pinSideMap = useMemo(() => {
    const map = new Map<string, { side: BoardSide; index: number; count: number }>();
    (["top", "right", "bottom", "left"] as BoardSide[]).forEach((side) => {
      const list = fullPinArrangement[side];
      list.forEach((item, index) => {
        map.set(item.pin.id, { side, index, count: list.length });
      });
    });
    return map;
  }, [fullPinArrangement]);

  const mcuPinsTop = pinArrangement.top;
  const mcuPinsRight = pinArrangement.right;
  const mcuPinsBottom = pinArrangement.bottom;
  const mcuPinsLeft = pinArrangement.left;

  const mcuBoardWidth = useMemo(() => {
    const rowWidth = perSide * pinItemWidth + Math.max(0, perSide - 1) * pinRowGap + pinRowInset * 2;
    return Math.max(mcuBoardMinWidth, Math.ceil(rowWidth));
  }, [perSide]);

  const mcuBoardHeight = useMemo(() => {
    const columnHeight = perSide * pinItemHeight + Math.max(0, perSide - 1) * pinColumnGap;
    const bodyHeight = pinColumnInset + columnHeight;
    return Math.max(260, Math.ceil(bodyHeight + boardHeaderHeight + boardHeightPadding));
  }, [perSide]);

  const sensorBoardLayout = useMemo(() => {
    const items = selectedSensorList.map((sensor) => {
      const allocationItem = allocationMap.get(sensor.id);
      let side: BoardSide = boardSidePriority[0];
      let anchor = 0.5;

      if (allocationItem) {
        const pinPoints = Object.values(allocationItem.assignedPins)
          .map((pinId) => pinSideMap.get(pinId))
          .filter(
            (info): info is { side: BoardSide; index: number; count: number } =>
              Boolean(info),
          )
          .map((info) => getPinPoint(info, mcuBoardWidth, mcuBoardHeight));

        if (pinPoints.length > 0) {
          const total = pinPoints.reduce(
            (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
            { x: 0, y: 0 },
          );
          const avg = { x: total.x / pinPoints.length, y: total.y / pinPoints.length };
          const distances: Record<BoardSide, number> = {
            left: avg.x,
            right: mcuBoardWidth - avg.x,
            top: avg.y,
            bottom: mcuBoardHeight - avg.y,
          };

          side = boardSidePriority[0];
          let bestDistance = distances[side];
          boardSidePriority.forEach((candidate) => {
            const distance = distances[candidate];
            if (distance < bestDistance) {
              bestDistance = distance;
              side = candidate;
            }
          });

          anchor = side === "left" || side === "right" ? avg.y / mcuBoardHeight : avg.x / mcuBoardWidth;
          anchor = clamp(anchor, 0, 1);
        }
      }

      const forcedSide = boardOrientations[sensor.id];
      if (forcedSide && forcedSide !== "auto") {
        side = forcedSide;
      }

      return { sensor, allocation: allocationItem, side, anchor };
    });
    const viewportWidth = canvasSize.viewportWidth || 0;
    const viewportHeight = canvasSize.viewportHeight || 0;
    const buckets: Record<BoardSide, typeof items> = { top: [], right: [], bottom: [], left: [] };

    items.forEach((item) => {
      buckets[item.side].push(item);
    });

    const rowWidth = (count: number) =>
      count > 0 ? count * sensorBoardWidth + (count - 1) * sensorBoardGapX : 0;
    const columnHeight = (count: number) =>
      count > 0 ? count * sensorBoardHeight + (count - 1) * sensorBoardGap : 0;

    const sideSpanX = Math.max(buckets.left.length, buckets.right.length) > 0 ? sensorBoardWidth + stagePadding : 0;
    const sideSpanY = Math.max(buckets.top.length, buckets.bottom.length) > 0 ? sensorBoardHeight + stagePadding : 0;

    let stageWidth = mcuBoardWidth + sideSpanX * 2 + stagePadding * 2;
    let stageHeight = mcuBoardHeight + sideSpanY * 2 + stagePadding * 2;

    stageWidth = Math.max(
      stageWidth,
      rowWidth(buckets.top.length) + stagePadding * 2,
      rowWidth(buckets.bottom.length) + stagePadding * 2,
      stageMinWidth,
      viewportWidth,
    );
    stageHeight = Math.max(
      stageHeight,
      columnHeight(buckets.left.length) + stagePadding * 2,
      columnHeight(buckets.right.length) + stagePadding * 2,
      stageMinHeight,
      viewportHeight,
    );

    const fallbackX = (stageWidth - mcuBoardWidth) / 2;
    const fallbackY = stagePadding;
    const baseX = mcuPosition?.x ?? fallbackX;
    const baseY = mcuPosition?.y ?? fallbackY;
    const mcuLeft = clamp(baseX, 0, stageWidth - mcuBoardWidth);
    const mcuTop = clamp(baseY, 0, stageHeight - mcuBoardHeight);
    const mcuRight = mcuLeft + mcuBoardWidth;
    const mcuBottom = mcuTop + mcuBoardHeight;

    const layouts: Array<typeof items[number] & { left: number; top: number }> = [];

    const leftItems = buckets.left.slice().sort((a, b) => a.anchor - b.anchor);
    const leftTargets = leftItems.map((item) => mcuTop + item.anchor * mcuBoardHeight);
    const leftTops = distributePositions(
      leftTargets,
      sensorBoardHeight,
      sensorBoardGap,
      stagePadding,
      stageHeight - stagePadding,
    );
    leftItems.forEach((item, index) => {
      layouts.push({
        ...item,
        left: mcuLeft - stagePadding - sensorBoardWidth,
        top: leftTops[index],
      });
    });

    const rightItems = buckets.right.slice().sort((a, b) => a.anchor - b.anchor);
    const rightTargets = rightItems.map((item) => mcuTop + item.anchor * mcuBoardHeight);
    const rightTops = distributePositions(
      rightTargets,
      sensorBoardHeight,
      sensorBoardGap,
      stagePadding,
      stageHeight - stagePadding,
    );
    rightItems.forEach((item, index) => {
      layouts.push({
        ...item,
        left: mcuRight + stagePadding,
        top: rightTops[index],
      });
    });

    const topItems = buckets.top.slice().sort((a, b) => a.anchor - b.anchor);
    const topTargets = topItems.map((item) => mcuLeft + item.anchor * mcuBoardWidth);
    const topLefts = distributePositions(
      topTargets,
      sensorBoardWidth,
      sensorBoardGapX,
      stagePadding,
      stageWidth - stagePadding,
    );
    topItems.forEach((item, index) => {
      layouts.push({
        ...item,
        left: topLefts[index],
        top: mcuTop - stagePadding - sensorBoardHeight,
      });
    });

    const bottomItems = buckets.bottom.slice().sort((a, b) => a.anchor - b.anchor);
    const bottomTargets = bottomItems.map((item) => mcuLeft + item.anchor * mcuBoardWidth);
    const bottomLefts = distributePositions(
      bottomTargets,
      sensorBoardWidth,
      sensorBoardGapX,
      stagePadding,
      stageWidth - stagePadding,
    );
    bottomItems.forEach((item, index) => {
      layouts.push({
        ...item,
        left: bottomLefts[index],
        top: mcuBottom + stagePadding,
      });
    });

    return { layouts, stageHeight, stageWidth };
  }, [
    selectedSensorList,
    allocationMap,
    canvasSize.viewportWidth,
    canvasSize.viewportHeight,
    mcuBoardHeight,
    mcuBoardWidth,
    pinSideMap,
    mcuPosition,
    boardOrientations,
  ]);

  const connections = useMemo<WireConnection[]>(() => {
    const list: WireConnection[] = [];
    allocation.allocations.forEach((item) => {
      Object.entries(item.assignedPins).forEach(([signal, pinId]) => {
        list.push({
          id: `${item.sensorId}-${signal}-${pinId}`,
          fromId: `mcu-pin-${pinId}`,
          toId: `sensor-${item.sensorId}-pin-${signal}`,
          tone: resolveWireTone(signal, item.interface),
        });
      });
    });
    return list;
  }, [allocation]);

  const focusSets = useMemo(() => {
    const wireIds = new Set<string>();
    const focusedMcuPins = new Set<string>();
    const focusedSensorPins = new Set<string>();
    const focusedSensors = new Set<string>();

    const parseMcuPinId = (fromId: string) => (fromId.startsWith("mcu-pin-") ? fromId.slice("mcu-pin-".length) : null);
    const parseSensorPin = (toId: string) => {
      if (!toId.startsWith("sensor-")) return null;
      const rest = toId.slice("sensor-".length);
      const splitIndex = rest.lastIndexOf("-pin-");
      if (splitIndex < 0) return null;
      return { sensorId: rest.slice(0, splitIndex), signal: rest.slice(splitIndex + 5) };
    };

    if (!hoverFocus) {
      return { wireIds, focusedMcuPins, focusedSensorPins, focusedSensors, hasFocus: false };
    }

    if (hoverFocus.kind === "mcuPin") {
      focusedMcuPins.add(hoverFocus.pinId);
      connections.forEach((connection) => {
        if (connection.fromId !== `mcu-pin-${hoverFocus.pinId}`) return;
        wireIds.add(connection.id);
        const parsed = parseSensorPin(connection.toId);
        if (parsed) {
          focusedSensors.add(parsed.sensorId);
          focusedSensorPins.add(`${parsed.sensorId}::${parsed.signal}`);
        }
      });
    } else if (hoverFocus.kind === "sensorSignal") {
      focusedSensors.add(hoverFocus.sensorId);
      focusedSensorPins.add(`${hoverFocus.sensorId}::${hoverFocus.signal}`);
      connections.forEach((connection) => {
        if (connection.toId !== `sensor-${hoverFocus.sensorId}-pin-${hoverFocus.signal}`) return;
        wireIds.add(connection.id);
        const pinId = parseMcuPinId(connection.fromId);
        if (pinId) focusedMcuPins.add(pinId);
      });
    } else if (hoverFocus.kind === "sensor") {
      focusedSensors.add(hoverFocus.sensorId);
      connections.forEach((connection) => {
        if (!connection.toId.startsWith(`sensor-${hoverFocus.sensorId}-pin-`)) return;
        wireIds.add(connection.id);
        const pinId = parseMcuPinId(connection.fromId);
        if (pinId) focusedMcuPins.add(pinId);
        const parsed = parseSensorPin(connection.toId);
        if (parsed) {
          focusedSensorPins.add(`${parsed.sensorId}::${parsed.signal}`);
        }
      });
    }

    return { wireIds, focusedMcuPins, focusedSensorPins, focusedSensors, hasFocus: wireIds.size > 0 };
  }, [connections, hoverFocus]);

  useEffect(() => {
    setBoardPositions((prev) => {
      const next: Record<string, { x: number; y: number }> = {};
      const validIds = new Set<string>();

      sensorBoardLayout.layouts.forEach((item) => {
        validIds.add(item.sensor.id);
        const existing = prev[item.sensor.id];
        if (existing && movedBoardsRef.current.has(item.sensor.id)) {
          next[item.sensor.id] = existing;
        } else {
          next[item.sensor.id] = { x: item.left, y: item.top };
        }
      });

      movedBoardsRef.current.forEach((id) => {
        if (!validIds.has(id)) movedBoardsRef.current.delete(id);
      });

      return next;
    });
  }, [sensorBoardLayout.layouts]);

  const updateWires = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stage = stageRef.current;
    const stageRect = stage?.getBoundingClientRect() ?? null;
    const canvasRect = canvas.getBoundingClientRect();
    const originLeft =
      stageRect && stage ? stageRect.left + stage.clientLeft * zoom : canvasRect.left - canvas.scrollLeft;
    const originTop =
      stageRect && stage ? stageRect.top + stage.clientTop * zoom : canvasRect.top - canvas.scrollTop;

    const scrollLeft = canvas.scrollLeft / zoom;
    const scrollTop = canvas.scrollTop / zoom;
    const nextPaths: WirePath[] = [];

    connections.forEach((connection) => {
      const fromEl = document.getElementById(connection.fromId);
      const toEl = document.getElementById(connection.toId);
      if (!fromEl || !toEl) return;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const start = {
        x: (fromRect.left - originLeft + fromRect.width / 2) / zoom,
        y: (fromRect.top - originTop + fromRect.height / 2) / zoom,
      };
      const end = {
        x: (toRect.left - originLeft + toRect.width / 2) / zoom,
        y: (toRect.top - originTop + toRect.height / 2) / zoom,
      };
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const directionX = dx === 0 ? 1 : Math.sign(dx);
      const directionY = dy === 0 ? 1 : Math.sign(dy);

      let d = "";
      if (absX >= absY) {
        const offset = Math.max(absX * 0.5, 80);
        const control1 = start.x + offset * directionX;
        const control2 = end.x - offset * directionX;
        d = `M ${start.x} ${start.y} C ${control1} ${start.y}, ${control2} ${end.y}, ${end.x} ${end.y}`;
      } else {
        const offset = Math.max(absY * 0.5, 80);
        const control1 = start.y + offset * directionY;
        const control2 = end.y - offset * directionY;
        d = `M ${start.x} ${start.y} C ${start.x} ${control1}, ${end.x} ${control2}, ${end.x} ${end.y}`;
      }

      nextPaths.push({ ...connection, d });
    });

    const width = sensorBoardLayout.stageWidth;
    const height = sensorBoardLayout.stageHeight;
    const viewportWidth = canvas.clientWidth / zoom;
    const viewportHeight = canvas.clientHeight / zoom;

    const maxMcuX = Math.max(0, width - mcuBoardWidth);
    const maxMcuY = Math.max(0, height - mcuBoardHeight);

    if (!mcuPosition && viewportWidth > 0 && viewportHeight > 0) {
      const viewCenterX = scrollLeft + viewportWidth / 2;
      const targetX = viewCenterX - mcuBoardWidth / 2;
      const targetY = stagePadding;
      setMcuPosition({ x: clamp(targetX, 0, maxMcuX), y: clamp(targetY, 0, maxMcuY) });
    } else if (mcuPosition) {
      const clampedX = clamp(mcuPosition.x, 0, maxMcuX);
      const clampedY = clamp(mcuPosition.y, 0, maxMcuY);
      if (clampedX !== mcuPosition.x || clampedY !== mcuPosition.y) {
        setMcuPosition({ x: clampedX, y: clampedY });
      }
    }

    setCanvasSize((prev) =>
      prev.width === width &&
      prev.height === height &&
      prev.viewportWidth === viewportWidth &&
      prev.viewportHeight === viewportHeight &&
      prev.scrollLeft === scrollLeft &&
      prev.scrollTop === scrollTop
        ? prev
        : { width, height, viewportWidth, viewportHeight, scrollLeft, scrollTop },
    );
    setWirePaths(nextPaths);
  }, [connections, mcuBoardHeight, mcuBoardWidth, mcuPosition, sensorBoardLayout.stageHeight, sensorBoardLayout.stageWidth, zoom]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateWires);
    return () => cancelAnimationFrame(frame);
  }, [
    updateWires,
    sensorBoardLayout.layouts,
    mcuPinsLeft,
    mcuPinsRight,
    mcuPinsTop,
    mcuPinsBottom,
    boardPositions,
    mcuPosition,
  ]);

  useEffect(() => {
    const handleResize = () => updateWires();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateWires]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleScroll = () => updateWires();
    canvas.addEventListener("scroll", handleScroll);
    return () => canvas.removeEventListener("scroll", handleScroll);
  }, [updateWires]);

  const handleToggleSensor = (id: string) => {
    setSelectedSensors((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSeriesChange = (nextSeries: (typeof mcuSeries)[number]) => {
    setSeries(nextSeries);
    const nextMcu = fullMcuCatalog.find((mcu) => mcu.series === nextSeries) ?? getDefaultMcu(nextSeries);
    setMcuId(nextMcu.id);
  };

  const handleExportJson = () => {
    const filename = buildExportName(currentMcu, "pinmap.json");
    try {
      const payload = buildPinmapJson(currentMcu, allocation);
      downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportCsv = () => {
    const filename = buildExportName(currentMcu, "pinmap.csv");
    try {
      const payload = buildPinmapCsv(currentMcu, allocation);
      downloadText(filename, payload, "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportSpl = () => {
    const filename = buildExportName(currentMcu, "spl.c");
    try {
      const payload = buildSplCode(currentMcu, allocation, { speedPreset: splSpeedPreset });
      downloadText(filename, payload, "text/x-c");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportHardware = () => {
    const filename = buildExportName(currentMcu, "hardware.json");
    try {
      const payload = buildHardwareJson(currentMcu, allocation, selectedSensorList);
      downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportHardwareCsv = () => {
    const pinUsageName = buildExportName(currentMcu, "hardware_pin_usage.csv");
    const wiringName = buildExportName(currentMcu, "hardware_wiring.csv");
    const bomName = buildExportName(currentMcu, "hardware_bom.csv");
    try {
      downloadText(pinUsageName, buildHardwarePinUsageCsv(currentMcu, allocation), "text/csv");
      downloadText(wiringName, buildHardwareWiringCsv(allocation), "text/csv");
      downloadText(bomName, buildHardwareBomCsv(selectedSensorList), "text/csv");
      pushToast("success", t.toastExportOk, `${pinUsageName} / ${wiringName} / ${bomName}`);
    } catch {
      pushToast("error", t.toastExportFail, pinUsageName);
    }
  };

  const handleExportBundle = () => {
    setExportBundleOpen(true);
  };

  const handleConfirmExportBundle = () => {
    const filename = buildExportName(currentMcu, "bundle.zip");
    try {
      const generatedAt = new Date().toISOString();
      const files: Array<{ name: string; kind: string }> = [];
      const entries: Array<{ name: string; content: string }> = [];

      if (exportBundleOptions.pinmapJson) {
        const name = buildExportName(currentMcu, "pinmap.json");
        entries.push({ name, content: JSON.stringify(buildPinmapJson(currentMcu, allocation), null, 2) });
        files.push({ name, kind: "pinmap_json" });
      }

      if (exportBundleOptions.pinmapCsv) {
        const name = buildExportName(currentMcu, "pinmap.csv");
        entries.push({ name, content: buildPinmapCsv(currentMcu, allocation) });
        files.push({ name, kind: "pinmap_csv" });
      }

      if (exportBundleOptions.hardwareJson) {
        const name = buildExportName(currentMcu, "hardware.json");
        entries.push({
          name,
          content: JSON.stringify(buildHardwareJson(currentMcu, allocation, selectedSensorList), null, 2),
        });
        files.push({ name, kind: "hardware_json" });
      }

      if (exportBundleOptions.hardwareCsv) {
        const pinUsageName = buildExportName(currentMcu, "hardware_pin_usage.csv");
        const wiringName = buildExportName(currentMcu, "hardware_wiring.csv");
        const bomName = buildExportName(currentMcu, "hardware_bom.csv");
        entries.push({ name: pinUsageName, content: buildHardwarePinUsageCsv(currentMcu, allocation) });
        entries.push({ name: wiringName, content: buildHardwareWiringCsv(allocation) });
        entries.push({ name: bomName, content: buildHardwareBomCsv(selectedSensorList) });
        files.push({ name: pinUsageName, kind: "hardware_pin_usage_csv" });
        files.push({ name: wiringName, kind: "hardware_wiring_csv" });
        files.push({ name: bomName, kind: "hardware_bom_csv" });
      }

      if (exportBundleOptions.spl) {
        const name = buildExportName(currentMcu, "spl.c");
        entries.push({ name, content: buildSplCode(currentMcu, allocation, { speedPreset: splSpeedPreset }) });
        files.push({ name, kind: "spl_c" });
      }

      if (entries.length === 0) {
        pushToast("error", t.toastExportFail, t.exportBundleEmpty);
        return;
      }

      const manifest = {
        schemaVersion: 1,
        kind: "export_bundle",
        generatedAt,
        mcu: {
          id: currentMcu.id,
          name: currentMcu.name,
          series: currentMcu.series,
          package: currentMcu.package,
        },
        sensors: selectedSensorList.map((sensor) => ({ id: sensor.id, name: sensor.name, interface: sensor.interface })),
        codegen: { splSpeedPreset },
        files,
      };

      const zipBlob = buildZipBlob([{ name: "manifest.json", content: JSON.stringify(manifest, null, 2) }, ...entries]);
      downloadBlob(filename, zipBlob);
      pushToast("success", t.toastExportOk, filename);
      setExportBundleOpen(false);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleDownloadSensorTemplateCsv = () => {
    const filename = "pinforge_sensor_template.csv";
    try {
      downloadText(filename, buildSensorTemplateCsv(), "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleDownloadSensorTemplateJson = () => {
    const filename = "pinforge_sensor_template.json";
    try {
      downloadText(filename, buildSensorTemplateJson(), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleDownloadMcuTemplateCsv = () => {
    const filename = "pinforge_mcu_template.csv";
    try {
      downloadText(filename, buildMcuTemplateCsv(), "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleDownloadMcuTemplateJson = () => {
    const filename = "pinforge_mcu_template.json";
    try {
      downloadText(filename, buildMcuTemplateJson(), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleDownloadConstraintTemplateJson = () => {
    const filename = "pinforge_constraints_template.json";
    try {
      downloadText(filename, buildConstraintTemplateJson(), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportSensorCatalogJson = () => {
    const filename = "pinforge_sensors_catalog.json";
    try {
      downloadText(filename, buildSensorCatalogJson(sensorCatalog), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportSensorCatalogCsv = () => {
    const filename = "pinforge_sensors_catalog.csv";
    try {
      downloadText(filename, buildSensorCatalogCsv(sensorCatalog), "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportMcuCatalogJson = () => {
    const filename = "pinforge_mcus_catalog.json";
    try {
      downloadText(filename, buildMcuCatalogJson(fullMcuCatalog), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportMcuCatalogCsv = () => {
    const filename = "pinforge_mcus_catalog.csv";
    try {
      downloadText(filename, buildMcuCatalogCsv(fullMcuCatalog), "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportConstraintCatalogJson = () => {
    const filename = "pinforge_constraints_catalog.json";
    try {
      downloadText(filename, buildConstraintCatalogJson(pinConstraints), "application/json");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportConstraintCatalogCsv = () => {
    const filename = "pinforge_constraints_catalog.csv";
    try {
      downloadText(filename, buildConstraintCatalogCsv(pinConstraints), "text/csv");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleExportDiagnostics = () => {
    const filename = "pinforge_diagnostics.txt";
    try {
      const text = buildDiagnosticsText({
        appName,
        appVersion,
        buildTime,
        mode: import.meta.env.MODE,
        platform: navigator.platform,
        language: navigator.language,
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        notes: {
          locale,
          series,
          mcuId,
          selectedSensors: String(selectedSensorList.length),
          customSensors: String(customSensors.length),
          customMcus: String(customMcus.length),
          constraints: String(pinConstraints.length),
        },
      });
      downloadText(filename, text, "text/plain");
      pushToast("success", t.toastExportOk, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const handleResetSettingsAction = () => {
    resetAppSettings();
    pushToast("info", t.resetSettingsLabel);
    setLocale("zh");
  };

  const readImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return null;
    return { name: file.name, text: await file.text() };
  };

  const formatImportErrors = (errors: string[]) => {
    if (errors.length === 0) return t.importEmpty;
    const preview = errors.slice(0, 3).join("; ");
    return errors.length > 3 ? `${preview}...` : preview;
  };

  const dedupeById = <T extends { id: string }>(values: T[]) => {
    const map = new Map<string, T>();
    values.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  const applyImportedSensors = (items: Sensor[], mode: CatalogImportMode) => {
    const incoming = dedupeById(items);
    if (mode === "replace") {
      setCustomSensors(incoming);
      return { applied: incoming.length, mode };
    }
    setCustomSensors((prev) => {
      const next = prev.slice();
      const indexById = new Map<string, number>();
      prev.forEach((sensor, index) => indexById.set(sensor.id, index));
      const appended: Sensor[] = [];
      incoming.forEach((sensor) => {
        const existingIndex = indexById.get(sensor.id);
        if (existingIndex === undefined) {
          appended.push(sensor);
          return;
        }
        next[existingIndex] = sensor;
      });
      return next.concat(appended);
    });
    return { applied: incoming.length, mode };
  };

  const applyImportedMcus = (items: MCU[], mode: CatalogImportMode) => {
    const incoming = dedupeById(items);
    if (mode === "replace") {
      setCustomMcus(incoming);
      return { applied: incoming.length, mode };
    }
    setCustomMcus((prev) => {
      const next = prev.slice();
      const indexById = new Map<string, number>();
      prev.forEach((mcu, index) => indexById.set(mcu.id, index));
      const appended: MCU[] = [];
      incoming.forEach((mcu) => {
        const existingIndex = indexById.get(mcu.id);
        if (existingIndex === undefined) {
          appended.push(mcu);
          return;
        }
        next[existingIndex] = mcu;
      });
      return next.concat(appended);
    });
    return { applied: incoming.length, mode };
  };

  const handleImportSensorsCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await readImportFile(event);
    if (!file) return;
    const result = parseSensorCatalogCsv(file.text);
    if (result.items.length === 0 && result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        sensors: { ok: false, message: `${t.importFailure}: ${formatImportErrors(result.errors)}` },
      }));
      pushToast("error", t.toastImportFail, t.importSensorsCsv);
    }
    setImportPreview({
      kind: "sensors",
      format: "csv",
      filename: file.name,
      schemaVersion: result.schemaVersion,
      items: result.items,
      errors: result.errors,
      mode: "merge",
    });
  };

  const handleImportSensorsJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await readImportFile(event);
    if (!file) return;
    const result = parseSensorCatalogJson(file.text);
    if (result.items.length === 0 && result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        sensors: { ok: false, message: `${t.importFailure}: ${formatImportErrors(result.errors)}` },
      }));
      pushToast("error", t.toastImportFail, t.importSensorsJson);
    }
    setImportPreview({
      kind: "sensors",
      format: "json",
      filename: file.name,
      schemaVersion: result.schemaVersion,
      items: result.items,
      errors: result.errors,
      mode: "merge",
    });
  };

  const handleImportMcuCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await readImportFile(event);
    if (!file) return;
    const result = parseMcuCatalogCsv(file.text);
    if (result.items.length === 0 && result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        mcus: { ok: false, message: `${t.importFailure}: ${formatImportErrors(result.errors)}` },
      }));
      pushToast("error", t.toastImportFail, t.importMcuCsv);
    }
    setImportPreview({
      kind: "mcus",
      format: "csv",
      filename: file.name,
      schemaVersion: result.schemaVersion,
      items: result.items,
      errors: result.errors,
      mode: "merge",
    });
  };

  const handleImportMcuJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await readImportFile(event);
    if (!file) return;
    const result = parseMcuCatalogJson(file.text);
    if (result.items.length === 0 && result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        mcus: { ok: false, message: `${t.importFailure}: ${formatImportErrors(result.errors)}` },
      }));
      pushToast("error", t.toastImportFail, t.importMcuJson);
    }
    setImportPreview({
      kind: "mcus",
      format: "json",
      filename: file.name,
      schemaVersion: result.schemaVersion,
      items: result.items,
      errors: result.errors,
      mode: "merge",
    });
  };

  const handleImportConstraintsJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await readImportFile(event);
    if (!file) return;
    const result = parseConstraintCatalogJson(file.text);
    if (result.items.length === 0 && result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        constraints: { ok: false, message: `${t.importFailure}: ${formatImportErrors(result.errors)}` },
      }));
      pushToast("error", t.toastImportFail, t.importConstraintsJson);
    }
    setImportPreview({
      kind: "constraints",
      format: "json",
      filename: file.name,
      schemaVersion: result.schemaVersion,
      items: result.items,
      errors: result.errors,
      mode: "replace",
    });
  };

  const handleApplyImportPreview = () => {
    if (!importPreview) return;
    if (importPreview.kind === "sensors") {
      const result = applyImportedSensors(importPreview.items as Sensor[], importPreview.mode);
      const errorNote = importPreview.errors.length > 0 ? `; ${t.importErrorsLabel}: ${importPreview.errors.length}` : "";
      const label = importPreview.format === "csv" ? t.importSensorsCsv : t.importSensorsJson;
      setImportStatus((prev) => ({
        ...prev,
        sensors: {
          ok: true,
          message: `${t.importSuccess}: ${result.applied} (${importPreview.mode === "merge" ? t.importModeMerge : t.importModeReplace})${errorNote}`,
        },
      }));
      pushToast("success", t.toastImportOk, `${label}: ${result.applied}`);
      setImportPreview(null);
      return;
    }

    if (importPreview.kind === "mcus") {
      const result = applyImportedMcus(importPreview.items as MCU[], importPreview.mode);
      const errorNote = importPreview.errors.length > 0 ? `; ${t.importErrorsLabel}: ${importPreview.errors.length}` : "";
      const label = importPreview.format === "csv" ? t.importMcuCsv : t.importMcuJson;
      setImportStatus((prev) => ({
        ...prev,
        mcus: {
          ok: true,
          message: `${t.importSuccess}: ${result.applied} (${importPreview.mode === "merge" ? t.importModeMerge : t.importModeReplace})${errorNote}`,
        },
      }));
      pushToast("success", t.toastImportOk, `${label}: ${result.applied}`);
      setImportPreview(null);
      return;
    }

    setPinConstraints(importPreview.items as PinConstraint[]);
    const errorNote = importPreview.errors.length > 0 ? `; ${t.importErrorsLabel}: ${importPreview.errors.length}` : "";
    setImportStatus((prev) => ({
      ...prev,
      constraints: { ok: true, message: `${t.importSuccess}: ${(importPreview.items as PinConstraint[]).length}${errorNote}` },
    }));
    pushToast("success", t.toastImportOk, `${t.importConstraintsJson}: ${(importPreview.items as PinConstraint[]).length}`);
    setImportPreview(null);
  };

  const buildProjectPayload = (): ProjectFile => {
    const validSensorIds = new Set(sensorCatalog.map((sensor) => sensor.id));
    const nextSelectedSensors = selectedSensors.filter((id) => validSensorIds.has(id));

    const nextBoardPositions: Record<string, { x: number; y: number }> = {};
    Object.entries(boardPositions).forEach(([sensorId, pos]) => {
      if (!validSensorIds.has(sensorId)) return;
      nextBoardPositions[sensorId] = pos;
    });

    const nextBoardOrientations: Record<string, BoardSide | "auto"> = {};
    Object.entries(boardOrientations).forEach(([sensorId, side]) => {
      if (!validSensorIds.has(sensorId)) return;
      nextBoardOrientations[sensorId] = side;
    });

    const nextPinLocks: PinLockMap = {};
    Object.entries(pinLocks).forEach(([sensorId, locks]) => {
      if (!validSensorIds.has(sensorId)) return;
      nextPinLocks[sensorId] = locks;
    });

    return {
      version: 1,
      locale,
      series,
      mcuId,
      selectedSensors: nextSelectedSensors,
      customSensors,
      customMcus,
      boardPositions: nextBoardPositions,
      boardOrientations: nextBoardOrientations,
      mcuPosition,
      pinLocks: nextPinLocks,
      pinConstraints,
    };
  };

  const handleSaveProject = () => {
    const filename = "pinforge_project.json";
    try {
      const payload = buildProjectPayload();
      downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
      pushToast("success", t.toastProjectSaved, filename);
    } catch {
      pushToast("error", t.toastExportFail, filename);
    }
  };

  const applyProject = (project: ProjectFile) => {
    const nextSeries = project.series ?? "F1";
    const nextCustomMcus = Array.isArray(project.customMcus) ? project.customMcus : [];
    const catalogMcu = mcuCatalog.concat(nextCustomMcus);
    const mcuMatch = catalogMcu.find((item) => item.id === project.mcuId);
    const nextMcuId = mcuMatch?.id ?? getDefaultMcu(nextSeries).id;
    const nextCustomSensors = Array.isArray(project.customSensors) ? project.customSensors : [];
    const catalog = sensors.concat(nextCustomSensors);
    const catalogIds = new Set(catalog.map((sensor) => sensor.id));
    const nextSelected = Array.isArray(project.selectedSensors)
      ? project.selectedSensors.filter((id) => catalogIds.has(id))
      : [];
    const nextConstraints =
      Array.isArray(project.pinConstraints) && project.pinConstraints.length > 0
        ? project.pinConstraints
        : defaultConstraints;
    const nextOrientationsRaw = project.boardOrientations ?? {};
    const nextOrientations: Record<string, BoardSide | "auto"> = {};
    Object.entries(nextOrientationsRaw).forEach(([sensorId, side]) => {
      if (!catalogIds.has(sensorId)) return;
      if (side !== "auto" && side !== "top" && side !== "right" && side !== "bottom" && side !== "left") return;
      nextOrientations[sensorId] = side;
    });

    setLocale(project.locale ?? "zh");
    setSeries(nextSeries);
    setMcuId(nextMcuId);
    setCustomSensors(nextCustomSensors);
    setCustomMcus(nextCustomMcus);
    setSelectedSensors(nextSelected);
    setBoardPositions(project.boardPositions ?? {});
    setBoardOrientations(nextOrientations);
    setMcuPosition(project.mcuPosition ?? null);
    setPinLocks(project.pinLocks ?? {});
    setPinConstraints(nextConstraints);
    movedBoardsRef.current = new Set(Object.keys(project.boardPositions ?? {}));
  };

  const handleLoadProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ProjectFile;
      if (!data || typeof data !== "object") {
        pushToast("error", t.toastProjectLoadFail, file.name);
        return;
      }
      applyProject(data);
      pushToast("success", t.toastProjectLoaded, file.name);
    } catch {
      pushToast("error", t.toastProjectLoadFail, file.name);
    }
  };

  const normalizeSignals = (raw: string) =>
    Array.from(new Set(raw.split(/[\s,;/]+/).map((item) => item.trim()).filter(Boolean))).map((signal) =>
      signal.toUpperCase(),
    );

  const buildIdBase = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const ensureUniqueId = (prefix: string, base: string, existing: Set<string>) => {
    const seed = base || "item";
    let id = `${prefix}${seed}`;
    let index = 1;
    while (existing.has(id)) {
      id = `${prefix}${seed}_${index}`;
      index += 1;
    }
    existing.add(id);
    return id;
  };

  const generateCustomId = (name: string) => {
    const existing = new Set(sensors.concat(customSensors).map((sensor) => sensor.id));
    return ensureUniqueId("custom_", buildIdBase(name) || "sensor", existing);
  };

  const resetCustomForm = (iface: InterfaceType = "I2C") => {
    setCustomForm({
      name: "",
      interface: iface,
      signals: defaultSignalsByInterface[iface].join(", "),
      description: "",
    });
    setEditingSensorId(null);
  };

  const handleCustomSubmit = () => {
    const name = customForm.name.trim();
    if (!name) return;
    const signals = normalizeSignals(customForm.signals);
    if (signals.length === 0) return;

    if (editingSensorId) {
      setCustomSensors((prev) =>
        prev.map((sensor) =>
          sensor.id === editingSensorId
            ? {
                ...sensor,
                name,
                interface: customForm.interface,
                signals,
                description: customForm.description.trim() || sensor.description,
              }
            : sensor,
        ),
      );
      resetCustomForm(customForm.interface);
      return;
    }

    const newSensor: Sensor = {
      id: generateCustomId(name),
      name,
      interface: customForm.interface,
      signals,
      description: customForm.description.trim() || "Custom sensor",
    };
    setCustomSensors((prev) => prev.concat(newSensor));
    resetCustomForm(customForm.interface);
  };

  const handleEditCustom = (sensor: Sensor) => {
    setCustomForm({
      name: sensor.name,
      interface: sensor.interface,
      signals: sensor.signals.join(", "),
      description: sensor.description,
    });
    setEditingSensorId(sensor.id);
  };

  const handleDeleteCustom = (sensorId: string) => {
    setCustomSensors((prev) => prev.filter((sensor) => sensor.id !== sensorId));
    setSelectedSensors((prev) => prev.filter((id) => id !== sensorId));
    setPinLocks((prev) => {
      if (!prev[sensorId]) return prev;
      const next = { ...prev };
      delete next[sensorId];
      return next;
    });
    setBoardPositions((prev) => {
      if (!prev[sensorId]) return prev;
      const next = { ...prev };
      delete next[sensorId];
      return next;
    });
    movedBoardsRef.current.delete(sensorId);
    if (editingSensorId === sensorId) {
      resetCustomForm(customForm.interface);
    }
  };

  const handleCustomInterfaceChange = (nextInterface: InterfaceType) => {
    setCustomForm((prev) => {
      const nextSignals = prev.signals.trim()
        ? prev.signals
        : defaultSignalsByInterface[nextInterface].join(", ");
      return { ...prev, interface: nextInterface, signals: nextSignals };
    });
  };

  const normalizeConstraintPins = (value: string) =>
    value
      .split(/[\s,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((pin) => pin.toUpperCase());

  const resetConstraintEditor = () => {
    setConstraintForm({ id: "", label: "", pins: "", reason: "", level: "hard", enabled: true });
    setEditingConstraintId(null);
  };

  const handleConstraintSubmit = () => {
    const id = constraintForm.id.trim();
    const label = constraintForm.label.trim();
    const pins = normalizeConstraintPins(constraintForm.pins);
    if (!label || pins.length === 0) {
      pushToast("error", t.toastImportFail, t.constraintsEditorTitle);
      return;
    }
    const reason = constraintForm.reason.trim() || "Constraint";
    const enabled = constraintForm.enabled;
    const level = constraintForm.level;

    if (editingConstraintId) {
      setPinConstraints((prev) =>
        prev.map((constraint) =>
          constraint.id === editingConstraintId
            ? { ...constraint, label, pins, reason, enabled, level, source: constraint.source ?? "custom" }
            : constraint,
        ),
      );
      resetConstraintEditor();
      return;
    }

    const desiredId = id || buildIdBase(label) || "constraint";
    const existing = new Set(pinConstraints.map((constraint) => constraint.id));
    const finalId = existing.has(desiredId) ? ensureUniqueId("constraint_", desiredId, existing) : desiredId;
    const nextConstraint: PinConstraint = {
      id: finalId,
      label,
      pins,
      level,
      enabled,
      source: "custom",
      reason,
      series: undefined,
      mcuIds: undefined,
    };
    setPinConstraints((prev) => prev.concat(nextConstraint));
    resetConstraintEditor();
  };

  const handleEditConstraint = (constraint: PinConstraint) => {
    setConstraintForm({
      id: constraint.id,
      label: constraint.label,
      pins: constraint.pins.join(", "),
      reason: constraint.reason,
      level: constraint.level,
      enabled: constraint.enabled !== false,
    });
    setEditingConstraintId(constraint.id);
  };

  const handleDeleteConstraint = (constraint: PinConstraint) => {
    if (constraint.source === "default") return;
    setPinConstraints((prev) => prev.filter((item) => item.id !== constraint.id));
    if (editingConstraintId === constraint.id) resetConstraintEditor();
  };

  const handleToggleConstraintEnabled = (id: string) => {
    setPinConstraints((prev) =>
      prev.map((constraint) => {
        if (constraint.id !== id) return constraint;
        const enabled = constraint.enabled !== false;
        return { ...constraint, enabled: !enabled };
      }),
    );
  };

  const handleChangeConstraintLevel = (id: string, level: PinConstraint["level"]) => {
    setPinConstraints((prev) => prev.map((constraint) => (constraint.id === id ? { ...constraint, level } : constraint)));
  };

  const handleRestoreDefaultConstraints = () => {
    setPinConstraints(defaultConstraints);
    resetConstraintEditor();
  };

  const handleLockChange = (sensorId: string, signal: string, pinId: string) => {
    setPinLocks((prev) => {
      const next: PinLockMap = { ...prev };
      const current = { ...(next[sensorId] ?? {}) };
      if (pinId) {
        current[signal] = pinId;
        next[sensorId] = current;
      } else {
        delete current[signal];
        if (Object.keys(current).length === 0) {
          delete next[sensorId];
        } else {
          next[sensorId] = current;
        }
      }
      return next;
    });
  };

  const getSignalOptions = useCallback(
    (sensor: Sensor, signal: string) => {
      const normalized = signal.toUpperCase();
      if (sensor.interface === "I2C") {
        if (normalized === "SCL") return i2cSclOptions;
        if (normalized === "SDA") return i2cSdaOptions;
        return [];
      }
      if (sensor.interface === "SPI") {
        if (normalized === "SCK") return spiSckOptions;
        if (normalized === "MISO") return spiMisoOptions;
        if (normalized === "MOSI") return spiMosiOptions;
        if (normalized === "CS") return gpioOptions;
        return [];
      }
      if (sensor.interface === "UART") {
        if (normalized === "TX") return uartTxOptions;
        if (normalized === "RX") return uartRxOptions;
        return [];
      }
      if (sensor.interface === "ADC") return currentMcu.analogPins;
      if (sensor.interface === "PWM") return currentMcu.pwmPins;
      if (sensor.interface === "GPIO" || sensor.interface === "ONE_WIRE") return gpioOptions;
      return [];
    },
    [
      currentMcu.analogPins,
      currentMcu.pwmPins,
      gpioOptions,
      i2cSclOptions,
      i2cSdaOptions,
      spiSckOptions,
      spiMisoOptions,
      spiMosiOptions,
      uartTxOptions,
      uartRxOptions,
    ],
  );

  const cycleSensorOrientation = (sensorId: string) => {
    setBoardOrientations((prev) => {
      const current = prev[sensorId] ?? "auto";
      const order: Array<BoardSide | "auto"> = ["auto", "right", "bottom", "left", "top"];
      const index = Math.max(0, order.indexOf(current));
      const next = order[(index + 1) % order.length];
      const map = { ...prev };
      if (next === "auto") {
        delete map[sensorId];
      } else {
        map[sensorId] = next;
      }
      return map;
    });
    movedBoardsRef.current.delete(sensorId);
    setBoardPositions((prev) => {
      if (!prev[sensorId]) return prev;
      const next = { ...prev };
      delete next[sensorId];
      return next;
    });
  };

  const orientationLabel = (value: BoardSide | "auto") => {
    if (value === "auto") return t.orientationAuto;
    if (value === "top") return t.orientationTop;
    if (value === "right") return t.orientationRight;
    if (value === "bottom") return t.orientationBottom;
    return t.orientationLeft;
  };

  const clampZoomValue = (value: number) => {
    const clamped = clamp(value, zoomMin, zoomMax);
    return Math.round(clamped * 100) / 100;
  };

  const applyZoom = (nextZoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setZoom(nextZoom);
      return;
    }
    const centerX = canvasSize.scrollLeft + canvasSize.viewportWidth / 2;
    const centerY = canvasSize.scrollTop + canvasSize.viewportHeight / 2;
    zoomAnchorRef.current = { x: centerX, y: centerY };
    setZoom(nextZoom);
  };

  const handleZoomIn = () => applyZoom(clampZoomValue(zoom + zoomStep));
  const handleZoomOut = () => applyZoom(clampZoomValue(zoom - zoomStep));
  const handleZoomReset = () => applyZoom(1);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const anchor = zoomAnchorRef.current;
    if (!canvas || !anchor) return;
    const viewportWidth = canvas.clientWidth / zoom;
    const viewportHeight = canvas.clientHeight / zoom;
    const targetLeft = (anchor.x - viewportWidth / 2) * zoom;
    const targetTop = (anchor.y - viewportHeight / 2) * zoom;
    const maxLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth);
    const maxTop = Math.max(0, canvas.scrollHeight - canvas.clientHeight);
    canvas.scrollLeft = clamp(targetLeft, 0, maxLeft);
    canvas.scrollTop = clamp(targetTop, 0, maxTop);
    zoomAnchorRef.current = null;
    requestAnimationFrame(updateWires);
  }, [updateWires, zoom]);

  const handleCanvasMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!spacePressedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    setHoverFocus(null);
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = canvas.scrollLeft;
    const startTop = canvas.scrollTop;
    document.body.style.cursor = "grabbing";

    const handleMove = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons !== 1) {
        handleUp();
        return;
      }
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      canvas.scrollLeft = startLeft - dx;
      canvas.scrollTop = startTop - dy;
    };

    const handleUp = () => {
      document.body.style.cursor = "default";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("blur", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("blur", handleUp);
  };

  const handleBoardMouseDown = (id: string) => (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (spacePressedRef.current) return;
    event.preventDefault();
    const fallback = sensorBoardLayout.layouts.find((item) => item.sensor.id === id);
    const origin = boardPositions[id] ?? (fallback ? { x: fallback.left, y: fallback.top } : null);
    if (!origin) return;
    const boardEl = event.currentTarget.closest(".board-node") as HTMLDivElement | null;
    if (boardEl) {
      boardEl.style.zIndex = "40";
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const maxX = Math.max(0, sensorBoardLayout.stageWidth - sensorBoardWidth);
    const maxY = Math.max(0, sensorBoardLayout.stageHeight - sensorBoardHeight);
    let didMove = false;

    const handleMove = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons !== 1) {
        handleUp();
        return;
      }
      const rawDx = moveEvent.clientX - startX;
      const rawDy = moveEvent.clientY - startY;
      if (!didMove && Math.abs(rawDx) < 2 && Math.abs(rawDy) < 2) return;
      if (!didMove) didMove = true;
      const dx = rawDx / zoom;
      const dy = rawDy / zoom;
      const nextX = Math.min(Math.max(origin.x + dx, 0), maxX);
      const nextY = Math.min(Math.max(origin.y + dy, 0), maxY);
      setBoardPositions((prev) => ({ ...prev, [id]: { x: nextX, y: nextY } }));
      requestAnimationFrame(updateWires);
    };

    const handleUp = () => {
      if (didMove) {
        movedBoardsRef.current.add(id);
      }
      document.body.style.cursor = "default";
      if (boardEl) {
        boardEl.style.zIndex = "20";
      }
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleMcuMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (spacePressedRef.current) return;
    if (mcuLocked) return;
    event.preventDefault();
    if (!mcuPosition) return;
    const boardEl = event.currentTarget.closest(".board-node") as HTMLDivElement | null;
    if (boardEl) {
      boardEl.style.zIndex = "40";
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const maxX = Math.max(0, sensorBoardLayout.stageWidth - mcuBoardWidth);
    const maxY = Math.max(0, sensorBoardLayout.stageHeight - mcuBoardHeight);

    const handleMove = (moveEvent: MouseEvent) => {
      if (moveEvent.buttons !== 1) {
        handleUp();
        return;
      }
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      const nextX = Math.min(Math.max(mcuPosition.x + dx, 0), maxX);
      const nextY = Math.min(Math.max(mcuPosition.y + dy, 0), maxY);
      setMcuPosition({ x: nextX, y: nextY });
      requestAnimationFrame(updateWires);
    };

    const handleUp = () => {
      document.body.style.cursor = "default";
      if (boardEl) {
        boardEl.style.zIndex = "20";
      }
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("blur", handleUp);
    };

    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("blur", handleUp);
  };

  const buildPinTitle = (pin: McuPin) => {
    const fnNames = pin.functions
      .map((fnItem) => fnItem.name)
      .filter((name) => name && name !== "GPIO");
    const usageLabel = allocation.pinUsage[pin.id]?.label;
    const titleParts = [pin.label, usageLabel, ...fnNames].filter(Boolean);
    return Array.from(new Set(titleParts)).join(" / ");
  };

  const renderMcuPin = (item: PinDisplay, align: "left" | "right" | "top" | "bottom") => {
    const tone = resolvePinTone(item.status, item.pin);
    const focused = focusSets.focusedMcuPins.has(item.pin.id);
    const padClass = `pin-pad ${tone}${focused ? " focus" : ""}`;
    const labelClass = `pin-label${focused ? " focus" : ""}`;
    if (align === "top") {
      return (
        <div
          key={item.pin.id}
          className="pin-item vertical top"
          title={buildPinTitle(item.pin)}
          onMouseEnter={() => setHoverFocus({ kind: "mcuPin", pinId: item.pin.id })}
          onMouseLeave={() => setHoverFocus(null)}
        >
          <span className={labelClass}>{item.pin.label}</span>
          <div id={`mcu-pin-${item.pin.id}`} className={padClass} />
        </div>
      );
    }
    if (align === "bottom") {
      return (
        <div
          key={item.pin.id}
          className="pin-item vertical bottom"
          title={buildPinTitle(item.pin)}
          onMouseEnter={() => setHoverFocus({ kind: "mcuPin", pinId: item.pin.id })}
          onMouseLeave={() => setHoverFocus(null)}
        >
          <div id={`mcu-pin-${item.pin.id}`} className={padClass} />
          <span className={labelClass}>{item.pin.label}</span>
        </div>
      );
    }

    return (
      <div
        key={item.pin.id}
        className={`pin-item ${align}`}
        title={buildPinTitle(item.pin)}
        onMouseEnter={() => setHoverFocus({ kind: "mcuPin", pinId: item.pin.id })}
        onMouseLeave={() => setHoverFocus(null)}
      >
        <span className={labelClass}>{item.pin.label}</span>
        <div id={`mcu-pin-${item.pin.id}`} className={padClass} />
      </div>
    );
  };

  const renderSensorPin = (sensorId: string, iface: string, signal: string) => {
    const tone = resolveWireTone(signal, iface);
    const focused = focusSets.focusedSensorPins.has(`${sensorId}::${signal}`);
    return (
      <div
        key={signal}
        className="sensor-pin"
        onMouseEnter={() => setHoverFocus({ kind: "sensorSignal", sensorId, signal })}
        onMouseLeave={() => setHoverFocus({ kind: "sensor", sensorId })}
      >
        <div id={`sensor-${sensorId}-pin-${signal}`} className={`pin-pad ${tone}${focused ? " focus" : ""}`} />
        <span className={`pin-label${focused ? " focus" : ""}`}>{signal}</span>
      </div>
    );
  };

  if (forceCrash) {
    throw new Error("PinForge crash test");
  }

  return (
    <div className="app-shell">
      <header className="navbar-area">
        <div className="app-brand">
          <div className="logo-box">PF</div>
          <div>
            <p className="brand-title">PinForge</p>
            <p className="brand-subtitle">{t.appSubtitle}</p>
          </div>
        </div>
        <div className="navbar-actions">
          <div className="lang-select">
            <span className="lang-label">{t.languageLabel}</span>
            <select
              className="select small"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="zh">{t.langZh}</option>
              <option value="en">{t.langEn}</option>
            </select>
          </div>
          <button className="btn ghost" onClick={() => setAboutOpen(true)}>
            {t.aboutLabel}
          </button>
          <button className="btn ghost" onClick={() => setDiagnosticsOpen(true)}>
            {t.diagnosticsLabel}
          </button>
          <button className="btn ghost" onClick={() => setSelectedSensors([])}>
            {t.clearSensors}
          </button>
          <button className="btn ghost" onClick={handleSaveProject}>
            {t.saveProject}
          </button>
          <button className="btn ghost" onClick={() => projectInputRef.current?.click()}>
            {t.loadProject}
          </button>
          <button className="btn" onClick={handleExportJson}>
            {t.exportJson}
          </button>
          <button className="btn outline" onClick={handleExportCsv}>
            {t.exportCsv}
          </button>
          <button className="btn outline" onClick={handleExportSpl}>
            {t.exportSpl}
          </button>
          <div className="codegen-select">
            <span className="codegen-label">{t.splSpeedPresetLabel}</span>
            <select
              className="select small"
              value={splSpeedPreset}
              onChange={(event) => setSplSpeedPreset(event.target.value as SplSpeedPresetId)}
            >
              <option value="standard">{t.splSpeedPresetStandard}</option>
              <option value="fast">{t.splSpeedPresetFast}</option>
            </select>
          </div>
          <button className="btn outline" onClick={handleExportHardware}>
            {t.exportHardware}
          </button>
          <button className="btn outline" onClick={handleExportHardwareCsv}>
            {t.exportHardwareCsv}
          </button>
          <button className="btn outline" onClick={handleExportBundle}>
            {t.exportBundle}
          </button>
          <input
            ref={projectInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleLoadProject}
            className="input-hidden"
          />
        </div>
      </header>

      <div className="layout-container">
        <aside className="sidebar-left">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <p className="sidebar-title">{t.panelMcuTitle}</p>
              <span className="sidebar-count">
                {selectedSensorList.length} {t.selectedLabel}
              </span>
            </div>
            <p className="sidebar-subtitle">{t.panelMcuSubtitle}</p>
          </div>

          <div className="sidebar-section">
            <div className="control-group">
              <label className="label">{t.seriesLabel}</label>
              <div className="chip-row">
                {mcuSeries.map((item) => (
                  <button
                    key={item}
                    className={`chip ${series === item ? "active" : ""}`}
                    onClick={() => handleSeriesChange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="label">{t.mcuLabel}</label>
              <select className="select" value={mcuId} onChange={(event) => setMcuId(event.target.value)}>
                {mcuOptions.map((mcu) => (
                  <option key={mcu.id} value={mcu.id}>
                    {mcu.name} - {mcu.package}
                  </option>
                ))}
              </select>
              <p className="hint">{currentMcu.notes}</p>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="control-group">
              <label className="label">{t.searchSensorsLabel}</label>
              <input
                className="input"
                placeholder={t.searchSensorsPlaceholder}
                value={sensorQuery}
                onChange={(event) => setSensorQuery(event.target.value)}
              />
            </div>

            <div className="sensor-list">
              {Object.entries(groupedSensors).map(([iface, items]) => (
                <div className="sensor-group" key={iface}>
                  <div className="sensor-header">
                    <span>{iface}</span>
                    <span className="sensor-count">{items.length}</span>
                  </div>
                  {items.map((sensor) => (
                    <button
                      key={sensor.id}
                      className={`sensor-item ${selectedSensors.includes(sensor.id) ? "selected" : ""}`}
                      onClick={() => handleToggleSensor(sensor.id)}
                    >
                      <div>
                        <p className="sensor-name">{sensor.name}</p>
                        <p className="sensor-meta">
                          {sensor.description} - {formatFunctions(sensor)}
                        </p>
                      </div>
                      <span className="sensor-toggle">{selectedSensors.includes(sensor.id) ? "ON" : "+"}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="sensor-group custom">
                <div className="sensor-header">
                  <span>{t.customSensorTitle}</span>
                </div>
                <p className="sensor-subtitle">{t.customSensorSubtitle}</p>
                <div className="custom-form">
                  <label className="label">{t.sensorNameLabel}</label>
                  <input
                    className="input"
                    placeholder={t.sensorNamePlaceholder}
                    value={customForm.name}
                    onChange={(event) => setCustomForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <label className="label">{t.sensorInterfaceLabel}</label>
                  <select
                    className="select"
                    value={customForm.interface}
                    onChange={(event) => handleCustomInterfaceChange(event.target.value as InterfaceType)}
                  >
                    {interfaceOptions.map((item) => (
                      <option key={item} value={item}>
                        {interfaceLabels[item]}
                      </option>
                    ))}
                  </select>
                  <label className="label">{t.sensorSignalsLabel}</label>
                  <input
                    className="input"
                    placeholder={t.sensorSignalsPlaceholder}
                    value={customForm.signals}
                    onChange={(event) => setCustomForm((prev) => ({ ...prev, signals: event.target.value }))}
                  />
                  <label className="label">{t.sensorDescriptionLabel}</label>
                  <input
                    className="input"
                    value={customForm.description}
                    onChange={(event) => setCustomForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                  <div className="custom-actions">
                    <button className="btn" onClick={handleCustomSubmit}>
                      {editingSensorId ? t.updateCustomSensor : t.addCustomSensor}
                    </button>
                    {editingSensorId && (
                      <button className="btn ghost" onClick={() => resetCustomForm(customForm.interface)}>
                        {t.cancelEdit}
                      </button>
                    )}
                  </div>
                </div>
                <div className="custom-list">
                  {customSensors.length === 0 && <p className="empty">{t.customSensorEmpty}</p>}
                  {customSensors.map((sensor) => (
                    <div className="custom-item" key={sensor.id}>
                      <div>
                        <p className="sensor-name">{sensor.name}</p>
                        <p className="sensor-meta">
                          {sensor.interface} - {sensor.signals.join(", ")}
                        </p>
                      </div>
                      <div className="custom-actions">
                        <button className="btn ghost" onClick={() => handleEditCustom(sensor)}>
                          {t.editCustomSensor}
                        </button>
                        <button className="btn outline" onClick={() => handleDeleteCustom(sensor.id)}>
                          {t.deleteCustomSensor}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section data-tools">
            <div className="sidebar-header">
              <p className="sidebar-title">{t.dataToolsTitle}</p>
            </div>
            <p className="sidebar-subtitle">{t.dataToolsSubtitle}</p>
            <div className="data-card">
              <div className="data-card-header">
                <p className="data-card-title">{t.sensorLabel}</p>
                <span className="data-card-meta">{t.importSensorsHint}</span>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleDownloadSensorTemplateCsv}>
                  {t.downloadSensorTemplateCsv}
                </button>
                <button className="btn ghost" onClick={handleDownloadSensorTemplateJson}>
                  {t.downloadSensorTemplateJson}
                </button>
                <button className="btn outline" onClick={() => sensorCsvInputRef.current?.click()}>
                  {t.importSensorsCsv}
                </button>
                <button className="btn outline" onClick={() => sensorJsonInputRef.current?.click()}>
                  {t.importSensorsJson}
                </button>
              </div>
              {importStatus.sensors && (
                <p className={`import-status ${importStatus.sensors.ok ? "ok" : "error"}`}>
                  {t.importStatusLabel}: {importStatus.sensors.message}
                </p>
              )}
            </div>
            <div className="data-card">
              <div className="data-card-header">
                <p className="data-card-title">MCU</p>
                <span className="data-card-meta">{t.importMcuHint}</span>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleDownloadMcuTemplateCsv}>
                  {t.downloadMcuTemplateCsv}
                </button>
                <button className="btn ghost" onClick={handleDownloadMcuTemplateJson}>
                  {t.downloadMcuTemplateJson}
                </button>
                <button className="btn outline" onClick={() => mcuCsvInputRef.current?.click()}>
                  {t.importMcuCsv}
                </button>
                <button className="btn outline" onClick={() => mcuJsonInputRef.current?.click()}>
                  {t.importMcuJson}
                </button>
              </div>
              {importStatus.mcus && (
                <p className={`import-status ${importStatus.mcus.ok ? "ok" : "error"}`}>
                  {t.importStatusLabel}: {importStatus.mcus.message}
                </p>
              )}
            </div>
            <div className="data-card">
              <div className="data-card-header">
                <p className="data-card-title">{t.constraintsLabel}</p>
                <span className="data-card-meta">{t.importConstraintsHint}</span>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleDownloadConstraintTemplateJson}>
                  {t.downloadConstraintTemplateJson}
                </button>
                <button className="btn outline" onClick={() => constraintJsonInputRef.current?.click()}>
                  {t.importConstraintsJson}
                </button>
              </div>
              {importStatus.constraints && (
                <p className={`import-status ${importStatus.constraints.ok ? "ok" : "error"}`}>
                  {t.importStatusLabel}: {importStatus.constraints.message}
                </p>
              )}
            </div>

            <div className="data-card">
              <div className="data-card-header">
                <p className="data-card-title">{t.catalogExportTitle}</p>
                <span className="data-card-meta">JSON / CSV</span>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleExportSensorCatalogCsv}>
                  {t.exportSensorsCatalogCsv}
                </button>
                <button className="btn ghost" onClick={handleExportSensorCatalogJson}>
                  {t.exportSensorsCatalogJson}
                </button>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleExportMcuCatalogCsv}>
                  {t.exportMcuCatalogCsv}
                </button>
                <button className="btn ghost" onClick={handleExportMcuCatalogJson}>
                  {t.exportMcuCatalogJson}
                </button>
              </div>
              <div className="data-actions">
                <button className="btn ghost" onClick={handleExportConstraintCatalogCsv}>
                  {t.exportConstraintsCatalogCsv}
                </button>
                <button className="btn ghost" onClick={handleExportConstraintCatalogJson}>
                  {t.exportConstraintsCatalogJson}
                </button>
              </div>
            </div>
            <input
              ref={sensorCsvInputRef}
              type="file"
              accept="text/csv,.csv"
              onChange={handleImportSensorsCsv}
              className="input-hidden"
            />
            <input
              ref={sensorJsonInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportSensorsJson}
              className="input-hidden"
            />
            <input
              ref={mcuCsvInputRef}
              type="file"
              accept="text/csv,.csv"
              onChange={handleImportMcuCsv}
              className="input-hidden"
            />
            <input
              ref={mcuJsonInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportMcuJson}
              className="input-hidden"
            />
            <input
              ref={constraintJsonInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportConstraintsJson}
              className="input-hidden"
            />
          </div>
        </aside>

        <main className="canvas-area">
          <div className="canvas-toolbar">
            <div className="canvas-title">
              <p className="canvas-title-main">{t.panelPinTitle}</p>
              <p className="canvas-title-sub">{t.panelPinSubtitle}</p>
            </div>
            <div className="canvas-toolbar-right">
              <div className="legend">
                <span className="legend-item bus">{t.legendBus}</span>
                <span className="legend-item sensor">{t.legendSensor}</span>
                <span className="legend-item reserved">{t.legendReserved}</span>
                <span className="legend-item power">{t.legendPower}</span>
              </div>
              <div className="zoom-controls">
                <button className="btn ghost small" onClick={handleZoomOut} disabled={zoom <= zoomMin + 0.001}>
                  {t.zoomOutLabel}
                </button>
                <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
                <button className="btn ghost small" onClick={handleZoomIn} disabled={zoom >= zoomMax - 0.001}>
                  {t.zoomInLabel}
                </button>
                <button className="btn ghost small" onClick={handleZoomReset} disabled={Math.abs(zoom - 1) < 0.001}>
                  {t.zoomResetLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="canvas-body" ref={canvasRef} onMouseDown={handleCanvasMouseDown}>
            <div
              className="canvas-stage-outer"
              style={{
                width: Math.max(sensorBoardLayout.stageWidth * zoom, 1),
                height: Math.max(sensorBoardLayout.stageHeight * zoom, 1),
              }}
            >
              <div
                className="canvas-stage-inner"
                style={{
                  width: Math.max(sensorBoardLayout.stageWidth, 1),
                  height: Math.max(sensorBoardLayout.stageHeight, 1),
                  transform: `scale(${zoom})`,
                }}
              >
                <div
                  className={`board-stage${focusSets.hasFocus ? " has-focus" : ""}`}
                  ref={stageRef}
                  style={{ height: sensorBoardLayout.stageHeight, width: sensorBoardLayout.stageWidth }}
                >
                  <svg
                    className="wire-layer"
                    width={Math.max(sensorBoardLayout.stageWidth, 1)}
                    height={Math.max(sensorBoardLayout.stageHeight, 1)}
                  >
                    {wirePaths.map((wire) => {
                      const focused = focusSets.hasFocus && focusSets.wireIds.has(wire.id);
                      const dimmed = focusSets.hasFocus && !focused;
                      return (
                        <path
                          key={wire.id}
                          className={`wire ${wire.tone}${focused ? " focus" : ""}${dimmed ? " dim" : ""}`}
                          d={wire.d}
                        />
                      );
                    })}
                  </svg>
              <div
                className="board-node mcu"
                style={{
                  height: mcuBoardHeight,
                  width: mcuBoardWidth,
                  top: mcuPosition?.y ?? 0,
                  left: mcuPosition?.x ?? 0,
                }}
              >
                <div className="board-header" onMouseDown={handleMcuMouseDown}>
                  <div className="board-header-left">
                    <button
                      className={`pin-toggle ${mcuLocked ? "fixed" : ""}`}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMcuLocked((prev) => !prev);
                      }}
                    >
                      {mcuLocked ? t.mcuUnlockLabel : t.mcuLockLabel}
                    </button>
                    <span className="board-title">{currentMcu.name}</span>
                  </div>
                  <span className="board-meta">{currentMcu.package}</span>
                </div>
                <div className="board-body mcu-body">
                  <div className="hole tl" />
                  <div className="hole tr" />
                  <div className="hole bl" />
                  <div className="hole br" />
                  <div className="chip-body">
                    <div className="chip-legs" />
                    <div className="chip-dot" />
                    <div className="chip-text">
                      {currentMcu.series}
                      <br />
                      {currentMcu.name}
                    </div>
                  </div>

                  <div className="pin-row top">{mcuPinsTop.map((item) => renderMcuPin(item, "top"))}</div>
                  <div className="pin-col left">
                    {mcuPinsLeft.map((item) => renderMcuPin(item, "left"))}
                  </div>
                  <div className="pin-col right">
                    {mcuPinsRight.map((item) => renderMcuPin(item, "right"))}
                  </div>
                  <div className="pin-row bottom">
                    {mcuPinsBottom.map((item) => renderMcuPin(item, "bottom"))}
                  </div>
                </div>
              </div>

              {sensorBoardLayout.layouts.map((item) => {
                const allocationItem = item.allocation;
                const position = boardPositions[item.sensor.id] ?? { x: item.left, y: item.top };
                const orientation = boardOrientations[item.sensor.id] ?? "auto";
                const focused = focusSets.focusedSensors.has(item.sensor.id);
                return (
                  <div
                    className={`board-node sensor side-${item.side}${focused ? " focus" : ""}`}
                    data-side={item.side}
                    key={item.sensor.id}
                    style={{ top: position.y, left: position.x }}
                    onMouseEnter={() => setHoverFocus({ kind: "sensor", sensorId: item.sensor.id })}
                    onMouseLeave={() => setHoverFocus(null)}
                  >
                    <div className="board-header" onMouseDown={handleBoardMouseDown(item.sensor.id)}>
                      <div className="board-header-left">
                        <button
                          className="pin-toggle"
                          title={t.orientationCycleLabel}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            cycleSensorOrientation(item.sensor.id);
                          }}
                        >
                          {orientationLabel(orientation)}
                        </button>
                        <span className="board-title">{item.sensor.name}</span>
                      </div>
                      <span className="board-meta">{item.sensor.interface}</span>
                    </div>
                    <div className="board-body sensor-body">
                      <div className="hole tl" />
                      <div className="hole tr" />
                      <div className="hole bl" />
                      <div className="hole br" />
                      <div className="sensor-display">
                        <span className="sensor-display-title">{item.sensor.interface}</span>
                        <span className="sensor-display-sub">{item.sensor.description}</span>
                      </div>
                      <div className="sensor-pin-row">
                        {allocationItem
                          ? Object.keys(allocationItem.assignedPins).map((signal) =>
                              renderSensorPin(item.sensor.id, allocationItem.interface, signal),
                            )
                          : (
                              <span className="sensor-empty">{t.noneLabel}</span>
                            )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sensorBoardLayout.layouts.length === 0 && (
                <div
                  className="board-node sensor placeholder"
                  style={{
                    top:
                      (mcuPosition?.y ?? stagePadding) +
                      mcuBoardHeight / 2 -
                      sensorBoardHeight / 2,
                    left:
                      Math.min(
                        sensorBoardLayout.stageWidth - stagePadding - sensorBoardWidth,
                        (mcuPosition?.x ?? (sensorBoardLayout.stageWidth - mcuBoardWidth) / 2) +
                          mcuBoardWidth +
                          stagePadding,
                      ),
                  }}
                >
                  <div className="board-header">
                    <span className="board-title">{t.selectSensorHint}</span>
                    <span className="board-meta">...</span>
                  </div>
                  <div className="board-body sensor-body">
                    <div className="hole tl" />
                    <div className="hole tr" />
                    <div className="hole bl" />
                    <div className="hole br" />
                    <div className="sensor-display">
                      <span className="sensor-display-title">{t.sensorLabel}</span>
                      <span className="sensor-display-sub">{t.searchSensorsLabel}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="sidebar-right">
          <div className="sidebar-section right-header">
            <p className="sidebar-title">{t.assignmentsTitle}</p>
            <p className="sidebar-subtitle">{t.assignmentsSubtitle}</p>
          </div>

          <div className="right-scroll">
            <div className="assignment-block">
              <h3>{t.i2cTitle}</h3>
              {allocation.buses.i2c.length === 0 && <p className="empty">{t.noI2c}</p>}
              {allocation.buses.i2c.map((bus) => (
                <div className="assignment-card" key={bus.id}>
                  <p className="assignment-title">{bus.id}</p>
                  <p className="assignment-meta">
                    SCL: {bus.scl} / SDA: {bus.sda}
                  </p>
                  <p className="assignment-meta">
                    {t.sensorsLabel}: {bus.sensors.join(", ") || t.noneLabel}
                  </p>
                </div>
              ))}
            </div>

            <div className="assignment-block">
              <h3>{t.spiTitle}</h3>
              {allocation.buses.spi.length === 0 && <p className="empty">{t.noSpi}</p>}
              {allocation.buses.spi.map((bus) => (
                <div className="assignment-card" key={bus.id}>
                  <p className="assignment-title">{bus.id}</p>
                  <p className="assignment-meta">
                    SCK: {bus.sck} / MOSI: {bus.mosi} / MISO: {bus.miso}
                  </p>
                  <p className="assignment-meta">CS: {bus.csPins.join(", ") || t.noneLabel}</p>
                  <p className="assignment-meta">
                    {t.sensorsLabel}: {bus.sensors.join(", ") || t.noneLabel}
                  </p>
                </div>
              ))}
            </div>

            <div className="assignment-block">
              <h3>{t.uartTitle}</h3>
              {allocation.buses.uart.length === 0 && <p className="empty">{t.noUart}</p>}
              {allocation.buses.uart.map((bus) => (
                <div className="assignment-card" key={bus.id}>
                  <p className="assignment-title">{bus.id}</p>
                  <p className="assignment-meta">
                    TX: {bus.tx} / RX: {bus.rx}
                  </p>
                  <p className="assignment-meta">
                    {t.sensorLabel}: {bus.sensor}
                  </p>
                </div>
              ))}
            </div>

            <div className="assignment-block">
              <h3>{t.pinLockTitle}</h3>
              <p className="hint">{t.pinLockHint}</p>
              {selectedSensorList.length === 0 && <p className="empty">{t.noSensorsSelected}</p>}
              {selectedSensorList.map((sensor) => {
                const allocationItem = allocationMap.get(sensor.id);
                const assignedPins = allocationItem?.assignedPins ?? {};
                const locks = pinLocks[sensor.id] ?? {};
                return (
                  <div className="assignment-card pin-lock-card" key={sensor.id}>
                    <div className="pin-lock-header">
                      <p className="assignment-title">{sensor.name}</p>
                      <p className="assignment-meta">
                        {sensor.interface}
                        {allocationItem?.busId ? ` / ${allocationItem.busId}` : ""}
                      </p>
                    </div>
                    <div className="pin-lock-table">
                      <div className="pin-lock-row header">
                        <span>{t.sensorSignalsLabel}</span>
                        <span>{t.pinLockTitle}</span>
                        <span>{t.assignedPinLabel}</span>
                      </div>
                      {sensor.signals.map((signal) => {
                        const options = getSignalOptions(sensor, signal);
                        const lockValue = locks[signal] ?? "";
                        const assigned = assignedPins[signal] ?? "-";
                        return (
                          <div className="pin-lock-row" key={`${sensor.id}-${signal}`}>
                            <span className="pin-lock-signal">{signal}</span>
                            <select
                              className="select pin-lock-select"
                              value={lockValue}
                              onChange={(event) => handleLockChange(sensor.id, signal, event.target.value)}
                            >
                              <option value="">{t.autoPinLabel}</option>
                              {options.map((pinId) => (
                                <option key={pinId} value={pinId}>
                                  {pinId}
                                </option>
                              ))}
                            </select>
                            <span className="pin-lock-assigned">{assigned}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="assignment-block">
              <h3>{t.conflictsTitle}</h3>
              {allocation.conflicts.length === 0 && <p className="empty success">{t.noConflicts}</p>}
              {allocation.conflicts.map((conflict) => {
                const conflictText = t.conflictMessages[conflict.message as keyof typeof t.conflictMessages];
                return (
                  <div className="conflict" key={`${conflict.sensorId}-${conflict.message}`}>
                    <p className="conflict-title">{conflict.sensorName}</p>
                    <p className="conflict-meta">{conflictText ?? conflict.message}</p>
                    {conflict.detail && <p className="conflict-meta">{conflict.detail}</p>}
                  </div>
                );
              })}
            </div>

            <div className="assignment-block">
              <h3>{t.warningsTitle}</h3>
              {allocation.warnings.length === 0 && <p className="empty success">{t.noWarnings}</p>}
              {allocation.warnings.map((warning) => (
                <div className="warning" key={`${warning.sensorId}-${warning.message}-${warning.detail ?? ""}`}>
                  <p className="warning-title">{warning.sensorName}</p>
                  <p className="warning-meta">
                    {warning.message === "soft_constraint"
                      ? t.warningSoftConstraint
                      : warning.message === "i2c_addr_collision"
                        ? t.warningI2cAddrCollision
                        : warning.message}
                  </p>
                  {warning.detail && (
                    <p className="warning-meta">
                      {t.warningDetailsTitle}: {warning.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="assignment-block">
              <h3>{t.constraintsEditorTitle}</h3>
              <p className="hint">{t.constraintsEditorSubtitle}</p>
              <div className="data-actions">
                <button className="btn outline" onClick={handleRestoreDefaultConstraints}>
                  {t.constraintRestoreDefaults}
                </button>
              </div>

              {pinConstraints.map((constraint) => (
                <div className="assignment-card" key={constraint.id}>
                  <div className="pin-lock-header">
                    <p className="assignment-title">{constraint.label}</p>
                    <div className="custom-actions">
                      <button
                        className="btn ghost"
                        onClick={() => handleToggleConstraintEnabled(constraint.id)}
                        title={constraint.enabled === false ? t.constraintDisabledLabel : t.constraintEnabledLabel}
                      >
                        {constraint.enabled === false ? t.constraintDisabledLabel : t.constraintEnabledLabel}
                      </button>
                      <select
                        className="select pin-lock-select"
                        value={constraint.level}
                        onChange={(event) => handleChangeConstraintLevel(constraint.id, event.target.value as PinConstraint["level"])}
                      >
                        <option value="hard">{t.constraintHardLabel}</option>
                        <option value="soft">{t.constraintSoftLabel}</option>
                      </select>
                      <button className="btn ghost" onClick={() => handleEditConstraint(constraint)}>
                        {t.editCustomSensor}
                      </button>
                      <button
                        className="btn outline"
                        onClick={() => handleDeleteConstraint(constraint)}
                        disabled={constraint.source === "default"}
                      >
                        {t.deleteCustomSensor}
                      </button>
                    </div>
                  </div>
                  <p className="assignment-meta">
                    {t.constraintPinsLabel}: {constraint.pins.join(", ") || t.noneLabel}
                  </p>
                  <p className="assignment-meta">
                    {t.constraintReasonLabel}: {constraint.reason}
                  </p>
                </div>
              ))}

              <div className="assignment-card">
                <p className="assignment-title">{editingConstraintId ? t.constraintUpdate : t.constraintAdd}</p>
                <div className="custom-form">
                  <label className="label">{t.constraintIdLabel}</label>
                  <input
                    className="input"
                    value={constraintForm.id}
                    onChange={(event) => setConstraintForm((prev) => ({ ...prev, id: event.target.value }))}
                    disabled={Boolean(editingConstraintId)}
                  />
                  <label className="label">{t.constraintLabelLabel}</label>
                  <input
                    className="input"
                    value={constraintForm.label}
                    onChange={(event) => setConstraintForm((prev) => ({ ...prev, label: event.target.value }))}
                  />
                  <label className="label">{t.constraintPinsLabel}</label>
                  <input
                    className="input"
                    value={constraintForm.pins}
                    onChange={(event) => setConstraintForm((prev) => ({ ...prev, pins: event.target.value }))}
                  />
                  <label className="label">{t.constraintReasonLabel}</label>
                  <input
                    className="input"
                    value={constraintForm.reason}
                    onChange={(event) => setConstraintForm((prev) => ({ ...prev, reason: event.target.value }))}
                  />
                  <div className="custom-actions">
                    <select
                      className="select"
                      value={constraintForm.level}
                      onChange={(event) =>
                        setConstraintForm((prev) => ({ ...prev, level: event.target.value as PinConstraint["level"] }))
                      }
                    >
                      <option value="hard">{t.constraintHardLabel}</option>
                      <option value="soft">{t.constraintSoftLabel}</option>
                    </select>
                    <select
                      className="select"
                      value={constraintForm.enabled ? "enabled" : "disabled"}
                      onChange={(event) => setConstraintForm((prev) => ({ ...prev, enabled: event.target.value === "enabled" }))}
                    >
                      <option value="enabled">{t.constraintEnabledLabel}</option>
                      <option value="disabled">{t.constraintDisabledLabel}</option>
                    </select>
                    <button className="btn" onClick={handleConstraintSubmit}>
                      {editingConstraintId ? t.constraintUpdate : t.constraintAdd}
                    </button>
                    {editingConstraintId && (
                      <button className="btn ghost" onClick={resetConstraintEditor}>
                        {t.cancelEdit}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={Boolean(importPreview)} title={t.importPreviewTitle} onClose={() => setImportPreview(null)}>
        {importPreview && (
          <div className="data-card">
            <div className="data-card-header">
              <p className="data-card-title">
                {importPreview.kind.toUpperCase()} ({importPreview.format.toUpperCase()})
              </p>
              <span className="data-card-meta">{importPreview.filename}</span>
            </div>
            <p className="data-card-meta">
              {t.schemaVersionLabel}: {importPreview.schemaVersion || 0}
            </p>
            <p className="data-card-meta">
              {t.importValidLabel}: {importPreview.items.length} / {t.importErrorsLabel}: {importPreview.errors.length}
            </p>

            {importPreview.kind !== "constraints" && (
              <div className="data-actions" style={{ justifyContent: "flex-start" }}>
                <span className="data-card-meta">{t.importModeLabel}</span>
                <button
                  className={`btn outline ${importPreview.mode === "merge" ? "active" : ""}`}
                  onClick={() => setImportPreview((prev) => (prev ? { ...prev, mode: "merge" } : prev))}
                >
                  {t.importModeMerge}
                </button>
                <button
                  className={`btn outline ${importPreview.mode === "replace" ? "active" : ""}`}
                  onClick={() => setImportPreview((prev) => (prev ? { ...prev, mode: "replace" } : prev))}
                >
                  {t.importModeReplace}
                </button>
              </div>
            )}

            {importPreview.errors.length > 0 && (
              <pre className="fatal-details">{importPreview.errors.slice(0, 20).join("\n")}</pre>
            )}

            <div className="data-actions">
              <button className="btn ghost" onClick={() => setImportPreview(null)}>
                {t.importCancel}
              </button>
              <button className="btn" onClick={handleApplyImportPreview} disabled={importPreview.items.length === 0}>
                {t.importApply}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={exportBundleOpen} title={t.exportBundleTitle} onClose={() => setExportBundleOpen(false)}>
        <div className="data-card">
          <div className="bundle-grid">
            <label className="bundle-item">
              <input
                type="checkbox"
                checked={exportBundleOptions.pinmapJson}
                onChange={(event) => setExportBundleOptions((prev) => ({ ...prev, pinmapJson: event.target.checked }))}
              />
              <span>{t.exportJson}</span>
            </label>
            <label className="bundle-item">
              <input
                type="checkbox"
                checked={exportBundleOptions.pinmapCsv}
                onChange={(event) => setExportBundleOptions((prev) => ({ ...prev, pinmapCsv: event.target.checked }))}
              />
              <span>{t.exportCsv}</span>
            </label>
            <label className="bundle-item">
              <input
                type="checkbox"
                checked={exportBundleOptions.hardwareJson}
                onChange={(event) => setExportBundleOptions((prev) => ({ ...prev, hardwareJson: event.target.checked }))}
              />
              <span>{t.exportHardware}</span>
            </label>
            <label className="bundle-item">
              <input
                type="checkbox"
                checked={exportBundleOptions.hardwareCsv}
                onChange={(event) => setExportBundleOptions((prev) => ({ ...prev, hardwareCsv: event.target.checked }))}
              />
              <span>{t.exportHardwareCsv}</span>
            </label>
            <label className="bundle-item">
              <input
                type="checkbox"
                checked={exportBundleOptions.spl}
                onChange={(event) => setExportBundleOptions((prev) => ({ ...prev, spl: event.target.checked }))}
              />
              <span>{t.exportSpl}</span>
            </label>
          </div>
          <div className="data-actions">
            <button className="btn ghost" onClick={() => setExportBundleOpen(false)}>
              {t.importCancel}
            </button>
            <button className="btn" onClick={handleConfirmExportBundle}>
              {t.exportBundleConfirm}
            </button>
          </div>
        </div>
      </Modal>

      <ToastHost items={toasts} onDismiss={dismissToast} />

      <Modal open={aboutOpen} title={t.aboutLabel} onClose={() => setAboutOpen(false)}>
        <div className="data-card">
          <div className="data-card-header">
            <p className="data-card-title">{appName}</p>
            <span className="data-card-meta">{appVersion}</span>
          </div>
          <p className="data-card-meta">{buildTime}</p>
          <div className="data-actions">
            <button
              className="btn outline"
              onClick={() => {
                handleResetSettingsAction();
                setAboutOpen(false);
              }}
            >
              {t.resetSettingsLabel}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={diagnosticsOpen} title={t.diagnosticsLabel} onClose={() => setDiagnosticsOpen(false)}>
        <div className="data-card">
          <div className="data-card-header">
            <p className="data-card-title">{appName}</p>
            <span className="data-card-meta">{appVersion}</span>
          </div>
          <p className="data-card-meta">{buildTime}</p>
          <div className="data-actions">
            <button className="btn" onClick={handleExportDiagnostics}>
              {t.exportDiagnosticsLabel}
            </button>
            <button
              className="btn outline"
              onClick={() => {
                handleResetSettingsAction();
                setDiagnosticsOpen(false);
              }}
            >
              {t.resetSettingsLabel}
            </button>
            <button className="btn ghost" onClick={() => setForceCrash(true)}>
              {t.crashTestLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;

