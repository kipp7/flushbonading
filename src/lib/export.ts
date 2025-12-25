import type { AllocationResult, MCU, Sensor } from "../types";

const escapeCsvCell = (value: string) => {
  const next = value ?? "";
  if (/[",\n\r]/.test(next)) {
    return `"${next.replaceAll("\"", "\"\"")}"`;
  }
  return next;
};

export const buildPinmapJson = (mcu: MCU, result: AllocationResult) => ({
  generatedAt: new Date().toISOString(),
  mcu: {
    id: mcu.id,
    name: mcu.name,
    series: mcu.series,
    package: mcu.package,
  },
  allocations: result.allocations,
  conflicts: result.conflicts,
  warnings: result.warnings,
  buses: result.buses,
  pinUsage: result.pinUsage,
});

export const buildPinmapCsv = (mcu: MCU, result: AllocationResult) => {
  const header = "pin,status,label";
  const lines = mcu.pins
    .slice()
    .sort((a, b) => a.port.localeCompare(b.port) || a.index - b.index)
    .map((pin) => {
      const usage = result.pinUsage[pin.id];
      return [
        escapeCsvCell(pin.id),
        escapeCsvCell(usage?.status ?? "available"),
        escapeCsvCell(usage?.label ?? ""),
      ].join(",");
    });
  return [header, ...lines].join("\n");
};

export const buildHardwareJson = (mcu: MCU, result: AllocationResult, sensors: Sensor[]) => {
  const pinUsageTable = mcu.pins
    .slice()
    .sort((a, b) => a.port.localeCompare(b.port) || a.index - b.index)
    .map((pin) => ({
      pinId: pin.id,
      status: result.pinUsage[pin.id]?.status ?? "available",
      label: result.pinUsage[pin.id]?.label ?? "",
    }));

  const wiringList = result.allocations.flatMap((item) =>
    Object.entries(item.assignedPins).map(([signal, pinId]) => ({
      sensorName: item.sensorName,
      interface: item.interface,
      busId: item.busId ?? "",
      signal,
      pinId,
    })),
  );

  const bomMap = new Map<string, { name: string; interface: string; count: number }>();
  sensors.forEach((sensor) => {
    const key = `${sensor.name}::${sensor.interface}`;
    const existing = bomMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      bomMap.set(key, { name: sensor.name, interface: sensor.interface, count: 1 });
    }
  });

  const bomSummary = Array.from(bomMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    mcu: {
      id: mcu.id,
      name: mcu.name,
      series: mcu.series,
      package: mcu.package,
    },
    pinUsageTable,
    wiringList,
    bomSummary,
    warnings: result.warnings,
    conflicts: result.conflicts,
  };
};

export const buildHardwarePinUsageCsv = (mcu: MCU, result: AllocationResult) => {
  const header = "pin_id,status,label";
  const lines = mcu.pins
    .slice()
    .sort((a, b) => a.port.localeCompare(b.port) || a.index - b.index)
    .map((pin) => {
      const usage = result.pinUsage[pin.id];
      return [
        escapeCsvCell(pin.id),
        escapeCsvCell(usage?.status ?? "available"),
        escapeCsvCell(usage?.label ?? ""),
      ].join(",");
    });
  return [header, ...lines].join("\n");
};

export const buildHardwareWiringCsv = (result: AllocationResult) => {
  const header = "sensor_name,interface,bus_id,signal,pin_id";
  const lines = result.allocations.flatMap((item) =>
    Object.entries(item.assignedPins).map(([signal, pinId]) =>
      [
        escapeCsvCell(item.sensorName),
        escapeCsvCell(item.interface),
        escapeCsvCell(item.busId ?? ""),
        escapeCsvCell(signal),
        escapeCsvCell(pinId),
      ].join(","),
    ),
  );
  return [header, ...lines].join("\n");
};

export const buildHardwareBomCsv = (sensors: Sensor[]) => {
  const header = "name,interface,count";
  const bomMap = new Map<string, { name: string; interface: string; count: number }>();
  sensors.forEach((sensor) => {
    const key = `${sensor.name}::${sensor.interface}`;
    const existing = bomMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      bomMap.set(key, { name: sensor.name, interface: sensor.interface, count: 1 });
    }
  });

  const lines = Array.from(bomMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) =>
      [escapeCsvCell(entry.name), escapeCsvCell(entry.interface), escapeCsvCell(String(entry.count))].join(","),
    );
  return [header, ...lines].join("\n");
};

export const downloadBlob = (filename: string, blob: Blob) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadText = (filename: string, content: string, mime: string) => {
  downloadBlob(filename, new Blob([content], { type: mime }));
};
