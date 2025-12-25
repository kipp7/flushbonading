import { allocatePins } from "../src/lib/allocator";
import { defaultConstraints } from "../src/data/constraints";
import { mcuCatalog } from "../src/data/mcus";
import { sensors } from "../src/data/sensors";
import type { Sensor } from "../src/types";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const mcu = mcuCatalog.find((item) => item.id === "stm32f103c8");
if (!mcu) {
  throw new Error("Missing STM32F103C8 in catalog.");
}

const bme280 = sensors.find((sensor) => sensor.id === "bme280");
if (!bme280) {
  throw new Error("Missing BME280 in catalog.");
}

const resultI2c = allocatePins(mcu, [bme280], {}, defaultConstraints);
assert(resultI2c.allocations.length === 1, "I2C allocation should succeed.");
assert(resultI2c.buses.i2c.length === 1, "I2C bus should be created.");

const locks = {
  bme280: { SCL: resultI2c.buses.i2c[0].scl, SDA: resultI2c.buses.i2c[0].sda },
};
const resultLocked = allocatePins(mcu, [bme280], locks, defaultConstraints);
assert(
  resultLocked.allocations[0].assignedPins.SCL === locks.bme280.SCL,
  "Locked SCL should be honored.",
);
assert(
  resultLocked.allocations[0].assignedPins.SDA === locks.bme280.SDA,
  "Locked SDA should be honored.",
);

const uartSensors: Sensor[] = Array.from({ length: 5 }, (_, index) => ({
  id: `uart_${index}`,
  name: `UART${index}`,
  interface: "UART",
  signals: ["TX", "RX"],
  description: "Test UART sensor",
}));
const resultUart = allocatePins(mcu, uartSensors, {}, defaultConstraints);
assert(resultUart.conflicts.length > 0, "UART conflicts should be detected when buses are exhausted.");

const lockedGpioSensor: Sensor = {
  id: "locked_gpio",
  name: "Locked GPIO",
  interface: "GPIO",
  signals: ["GPIO"],
  description: "Locked GPIO test",
};
const resultLockedGpio = allocatePins(mcu, [lockedGpioSensor], { locked_gpio: { GPIO: "PA13" } }, defaultConstraints);
assert(
  resultLockedGpio.conflicts.some((conflict) => conflict.message === "constraint_reserved"),
  "Locked GPIO should report constraint_reserved conflict.",
);

const collision1: Sensor = {
  id: "collision1",
  name: "Collision1",
  interface: "I2C",
  signals: ["SCL", "SDA"],
  description: "I2C collision test",
  i2cAddress: 0x76,
};
const collision2: Sensor = {
  id: "collision2",
  name: "Collision2",
  interface: "I2C",
  signals: ["SCL", "SDA"],
  description: "I2C collision test",
  i2cAddress: 0x76,
};
const resultCollision = allocatePins(mcu, [collision1, collision2], {}, defaultConstraints);
assert(
  resultCollision.warnings.some((warning) => warning.message === "i2c_addr_collision"),
  "I2C address collision should produce warning.",
);

const uartA: Sensor = {
  id: "uart_a",
  name: "UART A",
  interface: "UART",
  signals: ["TX", "RX"],
  description: "UART exclusivity test",
  requiredBusId: "USART1",
};
const uartB: Sensor = {
  id: "uart_b",
  name: "UART B",
  interface: "UART",
  signals: ["TX", "RX"],
  description: "UART exclusivity test",
  requiredBusId: "USART1",
};
const resultUartExclusive = allocatePins(mcu, [uartA, uartB], {}, defaultConstraints);
assert(
  resultUartExclusive.conflicts.some((conflict) => conflict.message === "uart_exclusive"),
  "UART exclusivity should produce conflict.",
);

console.log("Allocator checks passed.");
