import type { AllocationResult, MCU, PinConstraint, PinLockMap, PinUsage, Sensor } from "../types";

const isFree = (pinId: string, usedPins: Set<string>) => !usedPins.has(pinId);

const parsePinId = (pinId: string) => {
  const match = /^P([A-Z])(\d+)$/.exec(pinId);
  if (!match) return null;
  return { port: match[1], index: Number(match[2]) };
};

const comparePinId = (left: string, right: string) => {
  if (left === right) return 0;
  const parsedLeft = parsePinId(left);
  const parsedRight = parsePinId(right);
  if (!parsedLeft || !parsedRight) return left.localeCompare(right);
  if (parsedLeft.port !== parsedRight.port) return parsedLeft.port.localeCompare(parsedRight.port);
  return parsedLeft.index - parsedRight.index;
};

const isConstraintForMcu = (constraint: PinConstraint, mcu: MCU) => {
  if (constraint.mcuIds && !constraint.mcuIds.includes(mcu.id)) return false;
  if (constraint.series && !constraint.series.includes(mcu.series)) return false;
  return true;
};

export const allocatePins = (
  mcu: MCU,
  sensors: Sensor[],
  pinLocks: PinLockMap = {},
  constraints: PinConstraint[] = [],
): AllocationResult => {
  const usedPins = new Set<string>();
  const pinUsage: Record<string, PinUsage> = {};
  const allocations = [] as AllocationResult["allocations"];
  const conflicts = [] as AllocationResult["conflicts"];
  const warnings = [] as AllocationResult["warnings"];
  const i2cBuses: AllocationResult["buses"]["i2c"] = [];
  const spiBuses: AllocationResult["buses"]["spi"] = [];
  const uartBuses: AllocationResult["buses"]["uart"] = [];
  const usedUartBusIds = new Set<string>();
  const uartBusOwner = new Map<string, string>();
  const constraintPinMap = new Map<string, PinConstraint[]>();
  const sensorById = new Map<string, Sensor>(sensors.map((sensor) => [sensor.id, sensor]));

  const reservePin = (pinId: string, status: PinUsage["status"], label: string) => {
    usedPins.add(pinId);
    pinUsage[pinId] = { status, label };
    availableGpio.delete(pinId);
    availableAnalog.delete(pinId);
    availablePwm.delete(pinId);
  };

  const lockLabel = (label: string) => `${label} (Locked)`;

  const availableGpio = new Set(
    mcu.pins
      .filter((pin) => pin.port !== "SYS" && !pin.reserved && !pin.power)
      .map((pin) => pin.id),
  );
  const availableAnalog = new Set(mcu.analogPins);
  const availablePwm = new Set(mcu.pwmPins);

  for (const pin of mcu.pins) {
    if (pin.power) {
      usedPins.add(pin.id);
      pinUsage[pin.id] = { status: "power", label: pin.notes ?? "Power" };
    } else if (pin.reserved || mcu.reservedPins.includes(pin.id)) {
      usedPins.add(pin.id);
      pinUsage[pin.id] = { status: "reserved", label: pin.notes ?? "Reserved" };
    }
  }

  for (const pinId of usedPins) {
    availableGpio.delete(pinId);
    availableAnalog.delete(pinId);
    availablePwm.delete(pinId);
  }

  const registerConstraint = (pinId: string, constraint: PinConstraint) => {
    const list = constraintPinMap.get(pinId) ?? [];
    list.push(constraint);
    constraintPinMap.set(pinId, list);
  };

  const getHardConstraint = (pinId?: string) => {
    if (!pinId) return null;
    const list = constraintPinMap.get(pinId);
    if (!list || list.length === 0) return null;
    return list.find((constraint) => constraint.level === "hard" && constraint.enabled !== false) ?? null;
  };

  const getSoftConstraints = (pinId?: string) => {
    if (!pinId) return [];
    const list = constraintPinMap.get(pinId);
    if (!list || list.length === 0) return [];
    return list.filter((constraint) => constraint.level === "soft" && constraint.enabled !== false);
  };

  const describeConstraint = (constraint: PinConstraint) =>
    constraint.reason ? `${constraint.label} - ${constraint.reason}` : constraint.label;

  const applyConstraints = () => {
    constraints.forEach((constraint) => {
      if (constraint.enabled === false) return;
      if (!isConstraintForMcu(constraint, mcu)) return;
      constraint.pins.forEach((pinId) => {
        const exists = mcu.pins.some((pin) => pin.id === pinId);
        if (!exists) return;
        registerConstraint(pinId, constraint);
        if (constraint.level === "hard" && !pinUsage[pinId]) {
          reservePin(pinId, "reserved", `Constraint: ${constraint.label}`);
        }
      });
    });
  };

  applyConstraints();

  const findPinPair = (left: string[] | undefined, right: string[] | undefined) => {
    if (!left || !right) return null;
    for (const l of left) {
      for (const r of right) {
        if (l === r) continue;
        if (isFree(l, usedPins) && isFree(r, usedPins)) {
          return { left: l, right: r };
        }
      }
    }
    return null;
  };

  const ensureI2cBus = (lockScl?: string, lockSda?: string) => {
    for (const existing of i2cBuses) {
      if (lockScl && existing.scl !== lockScl) continue;
      if (lockSda && existing.sda !== lockSda) continue;
      return existing;
    }

    for (const bus of mcu.buses.i2c) {
      if (!lockScl && !lockSda) {
        const pair = findPinPair(bus.scl, bus.sda);
        if (!pair) continue;
        reservePin(pair.left, "bus", `${bus.id} SCL`);
        reservePin(pair.right, "bus", `${bus.id} SDA`);
        const assigned = { id: bus.id, scl: pair.left, sda: pair.right, sensors: [] as string[] };
        i2cBuses.push(assigned);
        return assigned;
      }

      if (lockScl && !bus.scl?.includes(lockScl)) continue;
      if (lockSda && !bus.sda?.includes(lockSda)) continue;
      const scl = lockScl ?? bus.scl?.find((pin) => isFree(pin, usedPins));
      const sda = lockSda ?? bus.sda?.find((pin) => isFree(pin, usedPins));
      if (!scl || !sda || scl === sda) continue;
      if (!isFree(scl, usedPins) || !isFree(sda, usedPins)) continue;
      reservePin(scl, "bus", lockScl ? lockLabel(`${bus.id} SCL`) : `${bus.id} SCL`);
      reservePin(sda, "bus", lockSda ? lockLabel(`${bus.id} SDA`) : `${bus.id} SDA`);
      const assigned = { id: bus.id, scl, sda, sensors: [] as string[] };
      i2cBuses.push(assigned);
      return assigned;
    }

    return null;
  };

  const ensureSpiBus = (lockSck?: string, lockMiso?: string, lockMosi?: string) => {
    for (const existing of spiBuses) {
      if (lockSck && existing.sck !== lockSck) continue;
      if (lockMiso && existing.miso !== lockMiso) continue;
      if (lockMosi && existing.mosi !== lockMosi) continue;
      return existing;
    }

    for (const bus of mcu.buses.spi) {
      if (!lockSck && !lockMiso && !lockMosi) {
        const sck = bus.sck?.find((pin) => isFree(pin, usedPins));
        const miso = bus.miso?.find((pin) => isFree(pin, usedPins));
        const mosi = bus.mosi?.find((pin) => isFree(pin, usedPins));
        if (sck && miso && mosi) {
          reservePin(sck, "bus", `${bus.id} SCK`);
          reservePin(miso, "bus", `${bus.id} MISO`);
          reservePin(mosi, "bus", `${bus.id} MOSI`);
          const assigned = { id: bus.id, sck, miso, mosi, csPins: [] as string[], sensors: [] as string[] };
          spiBuses.push(assigned);
          return assigned;
        }
        continue;
      }

      if (lockSck && !bus.sck?.includes(lockSck)) continue;
      if (lockMiso && !bus.miso?.includes(lockMiso)) continue;
      if (lockMosi && !bus.mosi?.includes(lockMosi)) continue;
      const sck = lockSck ?? bus.sck?.find((pin) => isFree(pin, usedPins));
      const miso = lockMiso ?? bus.miso?.find((pin) => isFree(pin, usedPins));
      const mosi = lockMosi ?? bus.mosi?.find((pin) => isFree(pin, usedPins));
      if (!sck || !miso || !mosi) continue;
      if (!isFree(sck, usedPins) || !isFree(miso, usedPins) || !isFree(mosi, usedPins)) continue;
      reservePin(sck, "bus", lockSck ? lockLabel(`${bus.id} SCK`) : `${bus.id} SCK`);
      reservePin(miso, "bus", lockMiso ? lockLabel(`${bus.id} MISO`) : `${bus.id} MISO`);
      reservePin(mosi, "bus", lockMosi ? lockLabel(`${bus.id} MOSI`) : `${bus.id} MOSI`);
      const assigned = { id: bus.id, sck, miso, mosi, csPins: [] as string[], sensors: [] as string[] };
      spiBuses.push(assigned);
      return assigned;
    }

    return null;
  };

  const reserveGpio = (label: string, lockedPin?: string) => {
    const pinId = lockedPin ?? Array.from(availableGpio.values()).sort(comparePinId)[0];
    if (!pinId) return null;
    if (lockedPin && !availableGpio.has(pinId)) return null;
    if (!isFree(pinId, usedPins)) return null;
    reservePin(pinId, "sensor", lockedPin ? lockLabel(label) : label);
    return pinId;
  };

  const reserveAnalog = (label: string, lockedPin?: string) => {
    const pinId = lockedPin ?? Array.from(availableAnalog.values()).sort(comparePinId)[0];
    if (!pinId) return null;
    if (lockedPin && !availableAnalog.has(pinId)) return null;
    if (!isFree(pinId, usedPins)) return null;
    reservePin(pinId, "sensor", lockedPin ? lockLabel(label) : label);
    return pinId;
  };

  const reservePwm = (label: string, lockedPin?: string) => {
    const pinId = lockedPin ?? Array.from(availablePwm.values()).sort(comparePinId)[0];
    if (!pinId) return null;
    if (lockedPin && !availablePwm.has(pinId)) return null;
    if (!isFree(pinId, usedPins)) return null;
    reservePin(pinId, "sensor", lockedPin ? lockLabel(label) : label);
    return pinId;
  };

  for (const sensor of sensors) {
    const locks = pinLocks[sensor.id] ?? {};
    if (sensor.interface === "I2C") {
      const lockScl = locks.SCL;
      const lockSda = locks.SDA;
      const constraintScl = getHardConstraint(lockScl);
      const constraintSda = getHardConstraint(lockSda);
      if (constraintScl || constraintSda) {
        const detail = constraintScl
          ? `${sensor.name} SCL -> ${lockScl} (${describeConstraint(constraintScl)})`
          : `${sensor.name} SDA -> ${lockSda} (${describeConstraint(constraintSda ?? constraintScl!)})`;
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
        continue;
      }
      if (lockScl && lockSda && lockScl === lockSda) {
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "locked_duplicate" });
        continue;
      }
      const bus = ensureI2cBus(lockScl, lockSda);
      if (!bus) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: lockScl || lockSda ? "locked_mismatch" : "no_i2c",
        });
        continue;
      }
      bus.sensors.push(sensor.name);
      allocations.push({
        sensorId: sensor.id,
        sensorName: sensor.name,
        interface: sensor.interface,
        busId: bus.id,
        assignedPins: { SCL: bus.scl, SDA: bus.sda },
      });
      continue;
    }

    if (sensor.interface === "SPI") {
      const lockSck = locks.SCK;
      const lockMiso = locks.MISO;
      const lockMosi = locks.MOSI;
      const lockCs = locks.CS;
      const constraintSck = getHardConstraint(lockSck);
      const constraintMiso = getHardConstraint(lockMiso);
      const constraintMosi = getHardConstraint(lockMosi);
      const constraintCs = getHardConstraint(lockCs);
      if (constraintSck || constraintMiso || constraintMosi || constraintCs) {
        const detail = constraintSck
          ? `${sensor.name} SCK -> ${lockSck} (${describeConstraint(constraintSck)})`
          : constraintMiso
            ? `${sensor.name} MISO -> ${lockMiso} (${describeConstraint(constraintMiso)})`
            : constraintMosi
              ? `${sensor.name} MOSI -> ${lockMosi} (${describeConstraint(constraintMosi)})`
              : `${sensor.name} CS -> ${lockCs} (${describeConstraint(constraintCs ?? constraintSck!)})`;
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
        continue;
      }
      const bus = ensureSpiBus(lockSck, lockMiso, lockMosi);
      if (!bus) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: lockSck || lockMiso || lockMosi ? "locked_mismatch" : "no_spi",
        });
        continue;
      }
      const csPin = reserveGpio(`${sensor.name} CS`, lockCs);
      if (!csPin) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: lockCs ? "locked_unavailable" : "no_spi_cs",
        });
        continue;
      }
      bus.csPins.push(csPin);
      bus.sensors.push(sensor.name);
      allocations.push({
        sensorId: sensor.id,
        sensorName: sensor.name,
        interface: sensor.interface,
        busId: bus.id,
        assignedPins: { SCK: bus.sck, MOSI: bus.mosi, MISO: bus.miso, CS: csPin },
      });
      continue;
    }

    if (sensor.interface === "UART") {
      const lockTx = locks.TX;
      const lockRx = locks.RX;
      const constraintTx = getHardConstraint(lockTx);
      const constraintRx = getHardConstraint(lockRx);
      if (constraintTx || constraintRx) {
        const detail = constraintTx
          ? `${sensor.name} TX -> ${lockTx} (${describeConstraint(constraintTx)})`
          : `${sensor.name} RX -> ${lockRx} (${describeConstraint(constraintRx ?? constraintTx!)})`;
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
        continue;
      }
      if (lockTx && lockRx && lockTx === lockRx) {
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "locked_duplicate" });
        continue;
      }

      const requiredBusId = sensor.requiredBusId?.trim();
      if (requiredBusId && usedUartBusIds.has(requiredBusId)) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: "uart_exclusive",
          detail: `${requiredBusId} already used by ${uartBusOwner.get(requiredBusId) ?? "another device"}`,
        });
        continue;
      }

      let allocated = false;
      for (const bus of mcu.buses.uart) {
        if (requiredBusId && bus.id !== requiredBusId) continue;
        if (usedUartBusIds.has(bus.id)) continue;
        if (lockTx && !bus.tx?.includes(lockTx)) continue;
        if (lockRx && !bus.rx?.includes(lockRx)) continue;
        const tx = lockTx ?? bus.tx?.find((pin) => isFree(pin, usedPins));
        const rx = lockRx ?? bus.rx?.find((pin) => isFree(pin, usedPins));
        if (tx && rx) {
          if (!isFree(tx, usedPins) || !isFree(rx, usedPins)) continue;
          reservePin(tx, "bus", `${bus.id} TX`);
          reservePin(rx, "bus", `${bus.id} RX`);
          uartBuses.push({ id: bus.id, tx, rx, sensor: sensor.name });
          usedUartBusIds.add(bus.id);
          uartBusOwner.set(bus.id, sensor.name);
          allocations.push({
            sensorId: sensor.id,
            sensorName: sensor.name,
            interface: sensor.interface,
            busId: bus.id,
            assignedPins: { TX: tx, RX: rx },
          });
          allocated = true;
          break;
        }
      }
      if (!allocated) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: lockTx || lockRx ? "locked_mismatch" : requiredBusId ? "uart_exclusive" : "no_uart",
        });
      }
      continue;
    }

    if (sensor.interface === "ADC") {
      const constraintPin = getHardConstraint(locks.AIN);
      if (constraintPin) {
        const detail = `${sensor.name} AIN -> ${locks.AIN} (${describeConstraint(constraintPin)})`;
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
        continue;
      }
      const pinId = reserveAnalog(`${sensor.name} AIN`, locks.AIN);
      if (!pinId) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: locks.AIN ? "locked_unavailable" : "no_adc",
        });
        continue;
      }
      allocations.push({
        sensorId: sensor.id,
        sensorName: sensor.name,
        interface: sensor.interface,
        assignedPins: { AIN: pinId },
      });
      continue;
    }

    if (sensor.interface === "PWM") {
      const constraintPin = getHardConstraint(locks.PWM);
      if (constraintPin) {
        const detail = `${sensor.name} PWM -> ${locks.PWM} (${describeConstraint(constraintPin)})`;
        conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
        continue;
      }
      const pinId = reservePwm(`${sensor.name} PWM`, locks.PWM);
      if (!pinId) {
        conflicts.push({
          sensorId: sensor.id,
          sensorName: sensor.name,
          message: locks.PWM ? "locked_unavailable" : "no_pwm",
        });
        continue;
      }
      allocations.push({
        sensorId: sensor.id,
        sensorName: sensor.name,
        interface: sensor.interface,
        assignedPins: { PWM: pinId },
      });
      continue;
    }

    const lockGpio = locks.GPIO ?? locks.DQ;
    const constraintPin = getHardConstraint(lockGpio);
    if (constraintPin) {
      const detail = `${sensor.name} GPIO -> ${lockGpio} (${describeConstraint(constraintPin)})`;
      conflicts.push({ sensorId: sensor.id, sensorName: sensor.name, message: "constraint_reserved", detail });
      continue;
    }
    const gpioPin = reserveGpio(`${sensor.name} GPIO`, lockGpio);
    if (!gpioPin) {
      conflicts.push({
        sensorId: sensor.id,
        sensorName: sensor.name,
        message: lockGpio ? "locked_unavailable" : "no_gpio",
      });
      continue;
    }
    allocations.push({
      sensorId: sensor.id,
      sensorName: sensor.name,
      interface: sensor.interface,
      assignedPins: { DQ: gpioPin },
    });
  }

  for (const pin of mcu.pins) {
    if (!pinUsage[pin.id]) {
      pinUsage[pin.id] = { status: "available" };
    }
  }

  const warningKeys = new Set<string>();
  allocations.forEach((item) => {
    Object.values(item.assignedPins).forEach((pinId) => {
      getSoftConstraints(pinId).forEach((constraint) => {
        const key = `${item.sensorId}::${constraint.id}`;
        if (warningKeys.has(key)) return;
        warningKeys.add(key);
        warnings.push({
          sensorId: item.sensorId,
          sensorName: item.sensorName,
          message: "soft_constraint",
          detail: `${pinId} (${describeConstraint(constraint)})`,
        });
      });
    });
  });

  const i2cByBus = new Map<string, Map<number, string[]>>();
  allocations.forEach((item) => {
    if (item.interface !== "I2C" || !item.busId) return;
    const sensor = sensorById.get(item.sensorId);
    if (!sensor || sensor.i2cAddress === undefined) return;
    const bus = i2cByBus.get(item.busId) ?? new Map<number, string[]>();
    const list = bus.get(sensor.i2cAddress) ?? [];
    list.push(item.sensorName);
    bus.set(sensor.i2cAddress, list);
    i2cByBus.set(item.busId, bus);
  });
  i2cByBus.forEach((byAddr, busId) => {
    byAddr.forEach((names, addr) => {
      if (names.length < 2) return;
      warnings.push({
        sensorId: `i2c:${busId}:${addr}`,
        sensorName: busId,
        message: "i2c_addr_collision",
        detail: `0x${addr.toString(16)} -> ${names.join(", ")}`,
      });
    });
  });

  return { allocations, conflicts, warnings, buses: { i2c: i2cBuses, spi: spiBuses, uart: uartBuses }, pinUsage };
};
